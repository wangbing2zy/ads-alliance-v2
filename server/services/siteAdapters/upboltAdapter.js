/**
 * UpboltAdapter - Site adapter for upbolt.to
 * Extracts video metadata (title, duration) from upbolt.to pages.
 */
export class UpboltAdapter {
  constructor() {
    this.siteName = 'upbolt.to';
  }

  /**
   * Check if this adapter can handle the given URL.
   * @param {string} url
   * @returns {boolean}
   */
  canHandle(url) {
    return url.includes('upbolt.to');
  }

  /**
   * Extract video metadata from a Playwright page.
   * @param {import('playwright').Page} page
   * @returns {Promise<{title: string|null, duration: number|null}>}
   */
  async extractMeta(page) {
    let title = null;
    let duration = null;

    try {
      // Try to get title from page title or h1/h2 elements
      title = await page.title();
      // Clean up title - remove site suffix if present
      if (title) {
        title = title.replace(/\s*[-|]\s*upbolt\.to\s*$/i, '').trim();
        if (!title) title = null;
      }

      // Try to get title from h1 or h2 if page title is generic
      if (!title || title === 'upbolt.to') {
        try {
          const h1Text = await page.$eval('h1', (el) => el.textContent?.trim());
          if (h1Text) title = h1Text;
        } catch { /* no h1 found */ }
      }

      // Try to get title from video element or meta tag
      if (!title) {
        try {
          title = await page.$eval('meta[property="og:title"]', (el) => el.getAttribute('content'));
        } catch { /* no meta title */ }
      }
    } catch (err) {
      console.error('[UpboltAdapter] Title extraction error:', err.message);
    }

    try {
      // Try to get duration from video element
      const durationStr = await page.evaluate(() => {
        const video = document.querySelector('video');
        if (video && video.duration && isFinite(video.duration)) {
          return Math.round(video.duration);
        }
        // Try to find duration text in common selectors
        const durationEl = document.querySelector('.duration, .video-duration, [class*="duration"]');
        if (durationEl) {
          const text = durationEl.textContent?.trim();
          if (text) return text;
        }
        return null;
      });

      if (typeof durationStr === 'number') {
        duration = durationStr;
      } else if (typeof durationStr === 'string') {
        // Parse duration string like "5:30" or "5m 30s"
        const parts = durationStr.split(':');
        if (parts.length === 2) {
          duration = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        } else if (parts.length === 3) {
          duration = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
        }
      }
    } catch (err) {
      console.error('[UpboltAdapter] Duration extraction error:', err.message);
    }

    return { title, duration };
  }
}
