//! Tag, title and preview extraction (ports of `note-utils.ts` / `tags.svelte.ts`).

use std::collections::HashSet;

use regex::Regex;
use serde::Deserialize;

/// One user-configured magic tag, mirroring the TS `MagicTag` shape.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MagicTag {
    pub pattern: String,
    pub match_type: String,
    pub tag: String,
}

enum MagicMatcher {
    /// `^[ \t]*<pattern>` (line start, after optional leading whitespace).
    StartsWith(Regex),
    /// `<pattern>[ \t]*$` (line end, before optional trailing whitespace).
    EndsWith(Regex),
    /// Plain substring.
    Contains(String),
    /// Substring bounded by line-start/space/tab before and space/tab/line-end after.
    ContainsWord(String),
}

pub(crate) struct Extractor {
    hashtag_re: Regex,
    fence_re: Regex,
    magic: Vec<(MagicMatcher, String)>, // (matcher, tag)
}

impl Extractor {
    pub(crate) fn new(magic_tags: &[MagicTag]) -> Self {
        let magic = magic_tags
            .iter()
            .filter_map(|mt| {
                let esc = regex::escape(&mt.pattern);
                let matcher = match mt.match_type.as_str() {
                    "starts_with" => {
                        MagicMatcher::StartsWith(Regex::new(&format!(r"(?m)^[ \t]*{esc}")).ok()?)
                    }
                    "ends_with" => {
                        MagicMatcher::EndsWith(Regex::new(&format!(r"(?m){esc}[ \t]*$")).ok()?)
                    }
                    "contains" => MagicMatcher::Contains(mt.pattern.clone()),
                    "contains_word" => MagicMatcher::ContainsWord(mt.pattern.clone()),
                    _ => return None,
                };
                Some((matcher, mt.tag.clone()))
            })
            .collect();

        Extractor {
            // TAG_PATTERN_SOURCE
            hashtag_re: Regex::new(r"#([a-zA-Z0-9/]{2,})(?:\(([^)]+)\))?").unwrap(),
            // FENCE_LANG_SOURCE, multiline
            fence_re: Regex::new(r"(?m)^```([a-zA-Z][a-zA-Z0-9]*)").unwrap(),
            magic,
        }
    }

    /// Order-preserving, de-duplicated union of hashtag, code, and magic tags.
    pub(crate) fn extract_tags(&self, content: &str) -> Vec<String> {
        let mut seen: HashSet<String> = HashSet::new();
        let mut out: Vec<String> = Vec::new();
        let push = |seen: &mut HashSet<String>, out: &mut Vec<String>, tag: String| {
            if seen.insert(tag.clone()) {
                out.push(tag);
            }
        };

        for cap in self.hashtag_re.captures_iter(content) {
            push(&mut seen, &mut out, cap[1].to_string());
        }
        for cap in self.fence_re.captures_iter(content) {
            push(&mut seen, &mut out, "code".to_string());
            push(&mut seen, &mut out, cap[1].to_lowercase());
        }
        for (matcher, tag) in &self.magic {
            if matcher.matches(content) {
                push(&mut seen, &mut out, tag.clone());
            }
        }
        out
    }
}

impl MagicMatcher {
    fn matches(&self, content: &str) -> bool {
        match self {
            MagicMatcher::StartsWith(re) | MagicMatcher::EndsWith(re) => re.is_match(content),
            MagicMatcher::Contains(p) => content.contains(p.as_str()),
            MagicMatcher::ContainsWord(p) => contains_word(content, p),
        }
    }
}

/// True if `pattern` occurs bounded by (line-start or space/tab) before and
/// (space/tab or line-end) after - the lookbehind/lookahead the `regex` crate
/// can't express, done by hand over byte offsets.
fn contains_word(content: &str, pattern: &str) -> bool {
    if pattern.is_empty() {
        return false;
    }
    let bytes = content.as_bytes();
    let mut start = 0;
    while let Some(rel) = content[start..].find(pattern) {
        let at = start + rel;
        let before_ok = at == 0
            || matches!(bytes[at - 1], b' ' | b'\t' | b'\n');
        let after = at + pattern.len();
        let after_ok = after == bytes.len()
            || matches!(bytes[after], b' ' | b'\t' | b'\n');
        if before_ok && after_ok {
            return true;
        }
        start = at + 1;
    }
    false
}

/// First non-empty line, ATX heading marker stripped (port of `extractTitle`).
pub(crate) fn extract_title(content: &str) -> String {
    static HEADING: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    let heading = HEADING.get_or_init(|| Regex::new(r"^#{1,6}\s+").unwrap());
    for line in content.split('\n') {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            return heading.replace(trimmed, "").trim().to_string();
        }
    }
    String::new()
}

/// Content after the title, trimmed, capped at 140 chars (port of `notePreview`).
pub(crate) fn note_preview(content: &str, title: &str) -> String {
    let rest = if !title.is_empty() {
        match content.find(title) {
            Some(i) => &content[i + title.len()..],
            None => content,
        }
    } else {
        content
    };
    rest.trim().chars().take(140).collect()
}
