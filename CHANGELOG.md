# Changelog

## [0.12.1](https://github.com/chainlist/balise/compare/v0.12.0...v0.12.1) (2026-05-27)


### Bug Fixes

* **journal:** add popover calendar button ([f31e90d](https://github.com/chainlist/balise/commit/f31e90d681347bb2f57ddf81ddf3fffa419774f7))
* **journal:** fix small size window calendar display by displaying a button instead of the full calendar ([ed9ab60](https://github.com/chainlist/balise/commit/ed9ab6073379e12d323129d9391bb3dabe915980))
* only notes with #journal tag are turned in the journal ([d59d15a](https://github.com/chainlist/balise/commit/d59d15a626d726522746885c9fa445ef83259868))

## [0.12.0](https://github.com/chainlist/balise/compare/v0.11.0...v0.12.0) (2026-05-27)


### Features

* **journal:** lazy note creation, local-date grouping, single focus ([7e06231](https://github.com/chainlist/balise/commit/7e0623119f843ee6fa5e026b6908f52dd10ff837))


### Bug Fixes

* change journal ordering ([556da9d](https://github.com/chainlist/balise/commit/556da9da7a69b1b3f70665d590d44ab90e160999))
* **checkbox:** change the way checkbox are displayed after a new line on MarkMode.Never ([00b8275](https://github.com/chainlist/balise/commit/00b8275d9335ca246915a2f1c22003d0b9e6b262))
* notes not saving on proper date ([fa72b14](https://github.com/chainlist/balise/commit/fa72b143972799aef11f3e9545994c80af96096a))

## [0.11.0](https://github.com/chainlist/balise/compare/v0.10.0...v0.11.0) (2026-05-26)


### Features

* **cm:** inline task editing via hover edit button in never mode ([aa3f6d7](https://github.com/chainlist/balise/commit/aa3f6d77569346186f59c8c3bfcc2ae9ef5a2a1d))
* **images:** Add images handling ([#14](https://github.com/chainlist/balise/issues/14)) ([72682b6](https://github.com/chainlist/balise/commit/72682b6f39668821410e35b5a773bcce1692910e))


### Bug Fixes

* **cm:** enable task card editing by revealing raw markdown on cursor line ([f7588ab](https://github.com/chainlist/balise/commit/f7588ab65fc53cde21115a5b8a9f973d5a5d43cf))
* **cm:** extend markNavPlugin to treat link widgets as atomic ranges ([d0ad0b9](https://github.com/chainlist/balise/commit/d0ad0b9353de09e6bf2542a235d07335090d9030))
* **cm:** restore ignoreEvents=false and button-only mousedown guard on TaskWidget ([804887f](https://github.com/chainlist/balise/commit/804887fc060c68059000eb51c9f78a5eaa384d6c))
* TaskCard events not working properly on MarkMode.Never and MarkMode.Cursor ([3e9a4c4](https://github.com/chainlist/balise/commit/3e9a4c4a8a4fea66f1c80a71a513b61dc431651b))

## [0.10.0](https://github.com/chainlist/balise/compare/v0.9.0...v0.10.0) (2026-05-26)


### Features

* **cm:** atomic ranges + canonical cursor stepping for hidden marks ([9c97b0f](https://github.com/chainlist/balise/commit/9c97b0f98dbdee0746ea99dcdc9e811ac108ca08))

## [0.9.0](https://github.com/chainlist/balise/compare/v0.8.0...v0.9.0) (2026-05-26)


### Features

* upgrading cargo ([e2eadd1](https://github.com/chainlist/balise/commit/e2eadd1444c6ed961a7af9fc5ee4994b6b7f2ddd))

## [0.8.0](https://github.com/chainlist/balise/compare/v0.7.0...v0.8.0) (2026-05-26)


### Features

* added built with section in About settings ([ae1bde7](https://github.com/chainlist/balise/commit/ae1bde7be0e2be1e748919d2da7d2dde9616c7a5))
* Added Wizzard on first launch ([a411089](https://github.com/chainlist/balise/commit/a411089faf69378ff701a68b2b8fb12449ffcfcd))

## [0.7.0](https://github.com/chainlist/balise/compare/v0.6.1...v0.7.0) (2026-05-25)


### Features

* tidy sidebar + add groups ([c5ab71d](https://github.com/chainlist/balise/commit/c5ab71dc421654cd0696cdcf82be540150183c7c))


### Bug Fixes

* dark mode ([4d54e64](https://github.com/chainlist/balise/commit/4d54e645eb73548951c469fb92e1779c333cfcab))
* notes not syncing from FS correctly ([5a639bb](https://github.com/chainlist/balise/commit/5a639bbf3c0a4efc517fad17edeaec759d7c858a))
* scroller not taking full editor width ([ebaf1a7](https://github.com/chainlist/balise/commit/ebaf1a7063d8d4cb85061f61f1c05394b0b594f5))

## [0.6.1](https://github.com/chainlist/balise/compare/v0.6.0...v0.6.1) (2026-05-25)


### Bug Fixes

* checkbox mark shown even with markMode setting set to ([8534bc5](https://github.com/chainlist/balise/commit/8534bc5de7433ba7158236632fb6e2d65757487e))

## [0.6.0](https://github.com/chainlist/balise/compare/v0.5.0...v0.6.0) (2026-05-25)


### Features

* add Checklists widget ([ae46a4c](https://github.com/chainlist/balise/commit/ae46a4cb9237146aa9e63b7ce2e47bcccb8245fa))
* add slash command menu to editor ([4c726a5](https://github.com/chainlist/balise/commit/4c726a588a617f20e4adbd59704f24320a5926d3))

## [0.5.0](https://github.com/chainlist/balise/compare/v0.4.0...v0.5.0) (2026-05-25)


### Features

* add manual auto update check ([7283a32](https://github.com/chainlist/balise/commit/7283a32c39e0037ae109fa5d45a15e9a6d3f662e))

## [0.4.0](https://github.com/chainlist/balise/compare/v0.3.2...v0.4.0) (2026-05-25)


### Features

* change max font size to 42 ([86f1e4a](https://github.com/chainlist/balise/commit/86f1e4a37edb40d55b635031323960e380d1fa61))

## [0.3.2](https://github.com/chainlist/balise/compare/v0.3.1...v0.3.2) (2026-05-25)


### Bug Fixes

* failing release job ([cbf298e](https://github.com/chainlist/balise/commit/cbf298e9c0190c5a5852ecbc1c6bdb6ce88caca6))

## [0.3.1](https://github.com/chainlist/balise/compare/v0.3.0...v0.3.1) (2026-05-25)


### Bug Fixes

* use PAT in release-please to allow triggering release workflow ([54e2980](https://github.com/chainlist/balise/commit/54e2980873199fbbf863e05584bed69f5d7b2eff))

## [0.3.0](https://github.com/chainlist/balise/compare/v0.2.0...v0.3.0) (2026-05-25)


### Features

* add auto-updater ([e4069ce](https://github.com/chainlist/balise/commit/e4069cebebc8e1a82610e394606cedc22a857a8b))
* add command palette with note/tag/command search, render markdown in TaskCard ([d9ba4da](https://github.com/chainlist/balise/commit/d9ba4da462d3d616d0b80f8ebe545f98cf7ffb04))
* add dashboard ([fbb8fa2](https://github.com/chainlist/balise/commit/fbb8fa25c7914b32296630d5451c7c69221b8bba))
* add highlight feature with =syntax= ([ed17ae0](https://github.com/chainlist/balise/commit/ed17ae0637d40679f32079aaaef03691037d6b41))
* add line height setting for the editor ([db1fe92](https://github.com/chainlist/balise/commit/db1fe92358f93c7b5308e7add929de46cd6ea6bb))
* add preview examples to markdown marks setting cards ([97bea20](https://github.com/chainlist/balise/commit/97bea202bbee3a8207ab566b116397a41aaccbfa))
* add settings modal ([ea1f1a1](https://github.com/chainlist/balise/commit/ea1f1a19198c561a54d68981744f579a579c2c80))
* add tagName component to avoid unecessary lookup ([e6df378](https://github.com/chainlist/balise/commit/e6df378cb3e3d7475632f0bbabaae7629096fc28))
* add title column to notes table, extract on create/update ([86516d4](https://github.com/chainlist/balise/commit/86516d44486fb930eb914b2f608f2f411475a566))
* add translations ([1300a14](https://github.com/chainlist/balise/commit/1300a1428aa6469166f2af85e7458c3e536ebdfb))
* add URL capbilities ([2150ce2](https://github.com/chainlist/balise/commit/2150ce21c5b8be9a578616f18f23ffbc1e45c2f4))
* added fs sync ([0c365d8](https://github.com/chainlist/balise/commit/0c365d888a4ecce8eb9bff3ed0f3fb0ac9acef50))
* added keymap ([2ae54eb](https://github.com/chainlist/balise/commit/2ae54eb946c24b528bc6475619afd788f6d9c800))
* added loading animation until UI is ready ([af24b7b](https://github.com/chainlist/balise/commit/af24b7b15ffad6b837c80b97f23f0d50a5bc7e52))
* added logo ([8d1eb7f](https://github.com/chainlist/balise/commit/8d1eb7f0e8c3232c27dfacc96ef487abf2a4bb4a))
* added related tag discovery ([819a891](https://github.com/chainlist/balise/commit/819a89104fddd68822c3c533c248fa23a0d16057))
* added settings store sync + custom editor view ([e5f1566](https://github.com/chainlist/balise/commit/e5f15669bee7294c8ab8947a6c4752050a596339))
* added shortcuts ([2830865](https://github.com/chainlist/balise/commit/2830865504b70626e2911174c5a3b1ec74d1e3e6))
* added task block ([5ecc269](https://github.com/chainlist/balise/commit/5ecc269e24ad20918c6a2fb5f5ad0b1c218d38d8))
* added updatenotifier + translations ([ed88c47](https://github.com/chainlist/balise/commit/ed88c47b0fe7ffb47cb5a6737b2a13f8bfc14c5a))
* code block ([51de7b1](https://github.com/chainlist/balise/commit/51de7b16f7781a63a060ae2e0366c6c589bbc1c4))
* fix marks to not toggle on keyinput style ([8335d75](https://github.com/chainlist/balise/commit/8335d7521f38a362cd035df105c251e5c3fc21db))
* optimized parsing regex ([5eb0303](https://github.com/chainlist/balise/commit/5eb0303f387a83a775d5bbc94e891df65827e733))
* replace sidebar sheets with centered dialog modals ([fd21319](https://github.com/chainlist/balise/commit/fd213195e79d764f945d02360d9d46805fd02a4c))
* show FTS5 excerpts with mark highlights in command palette ([a90b9af](https://github.com/chainlist/balise/commit/a90b9af14529662a4d31e5009a72c6cae0e92772))


### Bug Fixes

* active tag left border via data-active variants, add icon to workspace selector ([4de36e6](https://github.com/chainlist/balise/commit/4de36e67c633dffb5e9b6ef6d0f0834b7337baba))
* correct background zones (notes list gray, editor white) ([1295801](https://github.com/chainlist/balise/commit/1295801143f9c334f1bff560fbb2da70a0c1c18d))
* correct typo Personnal -&gt; Personal in default desk name ([733ccc4](https://github.com/chainlist/balise/commit/733ccc47ae087512eab6b0637d342e2b2bd35c8e))
* declare $props before $effect and await deleteNote in NoteEditor ([1459090](https://github.com/chainlist/balise/commit/1459090949558a3892c66a7e0623015be53bd9ac))
* imports ([efc4fea](https://github.com/chainlist/balise/commit/efc4fea56116746fda95dd69d6639e9a494e31ad))
* light sidebar with dark text matching the mockup ([c491354](https://github.com/chainlist/balise/commit/c491354f18cecdf1eeb7de2df119b8d88ce95d66))
* move UNTAGGED_FILTER to tags service and sync tags on FS import ([0716d28](https://github.com/chainlist/balise/commit/0716d28133dbdef0f95bdaf73a73c49ef830146c))
* note cards light blue tint, white only when selected ([c4bd44e](https://github.com/chainlist/balise/commit/c4bd44ef3f73324fb485a82bca062b19c369d41e))
* notes sidebar lighter blue-gray, not white ([8ab17c3](https://github.com/chainlist/balise/commit/8ab17c3f25de0543cab7f0d553fed894f8ab4f2b))
* notes sidebar white bg, distinct from nav sidebar ([d8c00a8](https://github.com/chainlist/balise/commit/d8c00a8cce5931bd9da67ebd3d52bcaa854e2f55))
* remove dead initDone state, ready depends solely on uiState.ready ([2bae0d3](https://github.com/chainlist/balise/commit/2bae0d32d836e373622c825af0f5b29b51489fc2))
* render button element in TagChip when navigate is true for a11y ([d2556e8](https://github.com/chainlist/balise/commit/d2556e8322156604df4eb40d22dbc82e86e0aae2))
* replace invalid &lt;dir&gt; element with &lt;div&gt; in Sidebar ([1e61daf](https://github.com/chainlist/balise/commit/1e61daf0edc6e8fd7e07a2dcdc6284df5d0a4700))
* replace non-interactive div with role=button and keyboard handler in TagSidebarItem ([0b57cdf](https://github.com/chainlist/balise/commit/0b57cdf3031084ca46128cdb22fcec904d056fe9))
* replace SvelteSet with Set in pure extractTags function, remove dead code in TaskCard ([4546857](https://github.com/chainlist/balise/commit/4546857111fd39b4f39324a021491f4aa757a2b8))
* sidebar bg matches app background (light blue-gray) ([0cdb33b](https://github.com/chainlist/balise/commit/0cdb33b9908ee9c2fbde7138cdd9aaf9892f5a5b))
* strip markdown heading prefix from note title in sidebar ([31affa9](https://github.com/chainlist/balise/commit/31affa9724fec9e95bd064f7e91eb09abc6aa0a3))
* support multiple subscribers in NoteSignals ([12414e5](https://github.com/chainlist/balise/commit/12414e50d2574fc80062be402f6d7773fe6e5aa0))
* task component now working properly ([1cb0509](https://github.com/chainlist/balise/commit/1cb0509b115b9f3f2ae0c4acd424986087b90294))
* trigger release workflow on release event and clean up tag format ([c129be8](https://github.com/chainlist/balise/commit/c129be85ab322c997a839690cc5a0f2809c81889))
* unselected cards outline-only, selected card white with shadow ([00f1794](https://github.com/chainlist/balise/commit/00f17945bc634a557b549bbd2336a0f8195e6058))
* unselected note cards transparent, selected card white with border ([e439038](https://github.com/chainlist/balise/commit/e439038ac96e392cb37ab446d43e8cd6313f0662))
* wrap each SQL migration in a transaction with rollback on failure ([9aba7ea](https://github.com/chainlist/balise/commit/9aba7ea4ed47c6651236281d7cdb2d697c0c4fc9))

## [0.2.0](https://github.com/chainlist/balise/compare/balise-v0.1.0...balise-v0.2.0) (2026-05-25)


### Features

* add auto-updater ([e4069ce](https://github.com/chainlist/balise/commit/e4069cebebc8e1a82610e394606cedc22a857a8b))
* add command palette with note/tag/command search, render markdown in TaskCard ([d9ba4da](https://github.com/chainlist/balise/commit/d9ba4da462d3d616d0b80f8ebe545f98cf7ffb04))
* add dashboard ([fbb8fa2](https://github.com/chainlist/balise/commit/fbb8fa25c7914b32296630d5451c7c69221b8bba))
* add highlight feature with =syntax= ([ed17ae0](https://github.com/chainlist/balise/commit/ed17ae0637d40679f32079aaaef03691037d6b41))
* add line height setting for the editor ([db1fe92](https://github.com/chainlist/balise/commit/db1fe92358f93c7b5308e7add929de46cd6ea6bb))
* add preview examples to markdown marks setting cards ([97bea20](https://github.com/chainlist/balise/commit/97bea202bbee3a8207ab566b116397a41aaccbfa))
* add settings modal ([ea1f1a1](https://github.com/chainlist/balise/commit/ea1f1a19198c561a54d68981744f579a579c2c80))
* add tagName component to avoid unecessary lookup ([e6df378](https://github.com/chainlist/balise/commit/e6df378cb3e3d7475632f0bbabaae7629096fc28))
* add title column to notes table, extract on create/update ([86516d4](https://github.com/chainlist/balise/commit/86516d44486fb930eb914b2f608f2f411475a566))
* add translations ([1300a14](https://github.com/chainlist/balise/commit/1300a1428aa6469166f2af85e7458c3e536ebdfb))
* add URL capbilities ([2150ce2](https://github.com/chainlist/balise/commit/2150ce21c5b8be9a578616f18f23ffbc1e45c2f4))
* added fs sync ([0c365d8](https://github.com/chainlist/balise/commit/0c365d888a4ecce8eb9bff3ed0f3fb0ac9acef50))
* added keymap ([2ae54eb](https://github.com/chainlist/balise/commit/2ae54eb946c24b528bc6475619afd788f6d9c800))
* added loading animation until UI is ready ([af24b7b](https://github.com/chainlist/balise/commit/af24b7b15ffad6b837c80b97f23f0d50a5bc7e52))
* added logo ([8d1eb7f](https://github.com/chainlist/balise/commit/8d1eb7f0e8c3232c27dfacc96ef487abf2a4bb4a))
* added related tag discovery ([819a891](https://github.com/chainlist/balise/commit/819a89104fddd68822c3c533c248fa23a0d16057))
* added settings store sync + custom editor view ([e5f1566](https://github.com/chainlist/balise/commit/e5f15669bee7294c8ab8947a6c4752050a596339))
* added shortcuts ([2830865](https://github.com/chainlist/balise/commit/2830865504b70626e2911174c5a3b1ec74d1e3e6))
* added task block ([5ecc269](https://github.com/chainlist/balise/commit/5ecc269e24ad20918c6a2fb5f5ad0b1c218d38d8))
* added updatenotifier + translations ([ed88c47](https://github.com/chainlist/balise/commit/ed88c47b0fe7ffb47cb5a6737b2a13f8bfc14c5a))
* code block ([51de7b1](https://github.com/chainlist/balise/commit/51de7b16f7781a63a060ae2e0366c6c589bbc1c4))
* fix marks to not toggle on keyinput style ([8335d75](https://github.com/chainlist/balise/commit/8335d7521f38a362cd035df105c251e5c3fc21db))
* optimized parsing regex ([5eb0303](https://github.com/chainlist/balise/commit/5eb0303f387a83a775d5bbc94e891df65827e733))
* replace sidebar sheets with centered dialog modals ([fd21319](https://github.com/chainlist/balise/commit/fd213195e79d764f945d02360d9d46805fd02a4c))
* show FTS5 excerpts with mark highlights in command palette ([a90b9af](https://github.com/chainlist/balise/commit/a90b9af14529662a4d31e5009a72c6cae0e92772))


### Bug Fixes

* active tag left border via data-active variants, add icon to workspace selector ([4de36e6](https://github.com/chainlist/balise/commit/4de36e67c633dffb5e9b6ef6d0f0834b7337baba))
* correct background zones (notes list gray, editor white) ([1295801](https://github.com/chainlist/balise/commit/1295801143f9c334f1bff560fbb2da70a0c1c18d))
* correct typo Personnal -&gt; Personal in default desk name ([733ccc4](https://github.com/chainlist/balise/commit/733ccc47ae087512eab6b0637d342e2b2bd35c8e))
* declare $props before $effect and await deleteNote in NoteEditor ([1459090](https://github.com/chainlist/balise/commit/1459090949558a3892c66a7e0623015be53bd9ac))
* imports ([efc4fea](https://github.com/chainlist/balise/commit/efc4fea56116746fda95dd69d6639e9a494e31ad))
* light sidebar with dark text matching the mockup ([c491354](https://github.com/chainlist/balise/commit/c491354f18cecdf1eeb7de2df119b8d88ce95d66))
* move UNTAGGED_FILTER to tags service and sync tags on FS import ([0716d28](https://github.com/chainlist/balise/commit/0716d28133dbdef0f95bdaf73a73c49ef830146c))
* note cards light blue tint, white only when selected ([c4bd44e](https://github.com/chainlist/balise/commit/c4bd44ef3f73324fb485a82bca062b19c369d41e))
* notes sidebar lighter blue-gray, not white ([8ab17c3](https://github.com/chainlist/balise/commit/8ab17c3f25de0543cab7f0d553fed894f8ab4f2b))
* notes sidebar white bg, distinct from nav sidebar ([d8c00a8](https://github.com/chainlist/balise/commit/d8c00a8cce5931bd9da67ebd3d52bcaa854e2f55))
* remove dead initDone state, ready depends solely on uiState.ready ([2bae0d3](https://github.com/chainlist/balise/commit/2bae0d32d836e373622c825af0f5b29b51489fc2))
* render button element in TagChip when navigate is true for a11y ([d2556e8](https://github.com/chainlist/balise/commit/d2556e8322156604df4eb40d22dbc82e86e0aae2))
* replace invalid &lt;dir&gt; element with &lt;div&gt; in Sidebar ([1e61daf](https://github.com/chainlist/balise/commit/1e61daf0edc6e8fd7e07a2dcdc6284df5d0a4700))
* replace non-interactive div with role=button and keyboard handler in TagSidebarItem ([0b57cdf](https://github.com/chainlist/balise/commit/0b57cdf3031084ca46128cdb22fcec904d056fe9))
* replace SvelteSet with Set in pure extractTags function, remove dead code in TaskCard ([4546857](https://github.com/chainlist/balise/commit/4546857111fd39b4f39324a021491f4aa757a2b8))
* sidebar bg matches app background (light blue-gray) ([0cdb33b](https://github.com/chainlist/balise/commit/0cdb33b9908ee9c2fbde7138cdd9aaf9892f5a5b))
* strip markdown heading prefix from note title in sidebar ([31affa9](https://github.com/chainlist/balise/commit/31affa9724fec9e95bd064f7e91eb09abc6aa0a3))
* support multiple subscribers in NoteSignals ([12414e5](https://github.com/chainlist/balise/commit/12414e50d2574fc80062be402f6d7773fe6e5aa0))
* task component now working properly ([1cb0509](https://github.com/chainlist/balise/commit/1cb0509b115b9f3f2ae0c4acd424986087b90294))
* unselected cards outline-only, selected card white with shadow ([00f1794](https://github.com/chainlist/balise/commit/00f17945bc634a557b549bbd2336a0f8195e6058))
* unselected note cards transparent, selected card white with border ([e439038](https://github.com/chainlist/balise/commit/e439038ac96e392cb37ab446d43e8cd6313f0662))
* wrap each SQL migration in a transaction with rollback on failure ([9aba7ea](https://github.com/chainlist/balise/commit/9aba7ea4ed47c6651236281d7cdb2d697c0c4fc9))
