import { describe, it, expect } from 'vitest';
import { matchEmbed, isImageUrl } from './embeds.config';

describe('matchEmbed', () => {
	it('returns null for a non-video URL', () => {
		expect(matchEmbed('https://example.com/page')).toBeNull();
	});

	it('returns null for a local image path', () => {
		expect(matchEmbed('attachments/123.png')).toBeNull();
	});

	describe('youtube', () => {
		it('matches a watch URL', () => {
			const m = matchEmbed('https://www.youtube.com/watch?v=GF-i7pXsan4');
			expect(m?.def.name).toBe('youtube');
			expect(m?.def.kind).toBe('video');
			expect(m?.src).toBe('https://www.youtube.com/embed/GF-i7pXsan4');
		});

		it('extracts the id from a watch URL with a playlist/index tail', () => {
			const m = matchEmbed(
				'https://www.youtube.com/watch?v=GF-i7pXsan4&list=OLAK5uy_nggD1pDZ8djX9Th2Vc7LFgRn8LX1BYHvc&index=10'
			);
			expect(m?.src).toBe('https://www.youtube.com/embed/GF-i7pXsan4');
		});

		it('matches a youtu.be short URL', () => {
			const m = matchEmbed('https://youtu.be/GF-i7pXsan4');
			expect(m?.src).toBe('https://www.youtube.com/embed/GF-i7pXsan4');
		});

		it('matches a shorts URL', () => {
			const m = matchEmbed('https://www.youtube.com/shorts/GF-i7pXsan4');
			expect(m?.src).toBe('https://www.youtube.com/embed/GF-i7pXsan4');
		});

		it('matches an already-embed URL', () => {
			const m = matchEmbed('https://www.youtube.com/embed/GF-i7pXsan4');
			expect(m?.src).toBe('https://www.youtube.com/embed/GF-i7pXsan4');
		});
	});

	describe('vimeo', () => {
		it('matches a plain vimeo URL', () => {
			const m = matchEmbed('https://vimeo.com/123456789');
			expect(m?.def.name).toBe('vimeo');
			expect(m?.src).toBe('https://player.vimeo.com/video/123456789');
		});

		it('matches a player URL', () => {
			const m = matchEmbed('https://player.vimeo.com/video/123456789');
			expect(m?.src).toBe('https://player.vimeo.com/video/123456789');
		});
	});

	describe('dailymotion', () => {
		it('matches a video URL', () => {
			const m = matchEmbed('https://www.dailymotion.com/video/x8abc12');
			expect(m?.def.name).toBe('dailymotion');
			expect(m?.src).toBe('https://www.dailymotion.com/embed/video/x8abc12');
		});

		it('matches a dai.ly short URL', () => {
			const m = matchEmbed('https://dai.ly/x8abc12');
			expect(m?.src).toBe('https://www.dailymotion.com/embed/video/x8abc12');
		});
	});
});

describe('isImageUrl', () => {
	it('treats a local attachment path as an image', () => {
		expect(isImageUrl('attachments/123.png')).toBe(true);
	});

	it('treats a bare relative path as an image', () => {
		expect(isImageUrl('photo.jpg')).toBe(true);
	});

	it('treats an http URL with an image extension as an image', () => {
		expect(isImageUrl('https://example.com/a.png')).toBe(true);
	});

	it('ignores a query string when checking the extension', () => {
		expect(isImageUrl('https://example.com/a.jpg?w=200')).toBe(true);
	});

	it('treats a data image URL as an image', () => {
		expect(isImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
	});

	it('treats a non-image http URL as a link', () => {
		expect(isImageUrl('https://example.com/article')).toBe(false);
	});

	it('treats a non-image data URL as a link', () => {
		expect(isImageUrl('data:text/plain;base64,aGk=')).toBe(false);
	});
});
