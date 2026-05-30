/**
 * AdInteractionService - 广告交互自动化处理
 * Handles video playback, new-tab ad capture, captcha solving, and completion detection.
 *
 * Target: vids.st (ArtPlayer 5.4.0) — click play → pop-up ad tabs → math captcha → video plays
 *
 * Features:
 * - New tab ad capture via context 'page' event (not iframe-based)
 * - Human-like browsing simulation on ad pages (scroll, mouse move)
 * - Math captcha auto-recognition and solving
 * - Human verification popup handling ("Are you human?" dialogs)
 * - Timeout retry mechanism for stuck ad pages
 * - Video playback confirmation after ad handling
 * - Cloudflare challenge auto-wait and bypass
 * - ArtPlayer + JWPlayer support
 */

export class AdInteractionService {
  /**
   * @param {import('./browserService.js').BrowserService} browserService
   */
  constructor(browserService = null) {
    this.browserService = browserService;

    /** @type {number} Max retries for ad interaction timeout */
    this.MAX_AD_RETRIES = 1;

    /** @type {number} Default timeout for ad page load (ms) */
    this.AD_PAGE_LOAD_TIMEOUT = 15000;

    /** @type {number} Default timeout for video play confirmation (ms) */
    this.VIDEO_PLAY_CONFIRM_TIMEOUT = 30000;

    /** @type {number} Minimum stay on ad page (ms) */
    this.AD_STAY_MIN_MS = 5000;

    /** @type {number} Maximum stay on ad page (ms) */
    this.AD_STAY_MAX_MS = 12000;
  }

  // ==========================================================================
  // Main Entry Point
  // ==========================================================================

  /**
   * Play a video with full ad interaction handling.
   * Handles new-tab pop-up ads, captchas, verification dialogs, and video confirmation.
   *
   * @param {import('playwright').Page} page - Playwright page instance
   * @param {import('playwright').BrowserContext} context - Browser context (for new-tab capture)
   * @param {object} rule - AdRule configuration
   * @param {string} videoUrl - Video URL to navigate to
   * @returns {Promise<{success: boolean, duration: number, error?: string}>}
   */
  async playVideo(page, context, rule, videoUrl) {
    const startTime = Date.now();

    try {
      // ── Step 1: Navigate to video page ──────────────────────────────
      console.log(`[AdInteraction] Navigating to: ${videoUrl}`);
      // Use domcontentloaded instead of networkidle — many ad-heavy sites (like vids.st)
      // have persistent network connections that prevent networkidle from ever resolving.
      // We handle dynamic content loading explicitly below.
      await page.goto(videoUrl, {
        timeout: rule.pageLoadTimeout || 90000,
        waitUntil: 'domcontentloaded',
      });

      // Check and wait for Cloudflare challenge
      if (this.browserService) {
        await this.browserService.waitForCloudflareChallenge(page, 60000);
      } else {
        await this._handleCloudflareFallback(page);
      }

      // Verify we're past the challenge
      const pageContent = await page.evaluate(() => {
        const bodyText = document.body?.innerText || '';
        return {
          isStillCF: bodyText.includes('Just a moment') || bodyText.includes('Checking your browser'),
          hasVideo: !!document.querySelector('video'),
          hasArtPlayer: !!document.querySelector('.art-video-player'),
          hasJWPlayer: !!document.querySelector('.jwplayer, #vplayer'),
          hasIframe: !!document.querySelector('iframe'),
          title: document.title || '',
          bodyLength: bodyText.length,
        };
      });

      if (pageContent.isStillCF) {
        return { success: false, duration: Date.now() - startTime, error: 'Cloudflare challenge not passed' };
      }

      console.log(`[AdInteraction] Page loaded: title="${pageContent.title}", hasVideo=${pageContent.hasVideo}, hasArtPlayer=${pageContent.hasArtPlayer}, hasJWPlayer=${pageContent.hasJWPlayer}, bodyLen=${pageContent.bodyLength}`);

      // Wait for dynamic content if body is suspiciously short
      if (pageContent.bodyLength < 1000) {
        console.log('[AdInteraction] Page body is short, waiting for dynamic content...');
        try {
          await page.waitForFunction(
            () => (document.body?.innerText?.length || 0) > 1000,
            { timeout: 30000, polling: 1000 }
          );
          const newLen = await page.evaluate(() => document.body?.innerText?.length || 0);
          console.log(`[AdInteraction] Body expanded to ${newLen} chars`);
        } catch {
          console.log('[AdInteraction] Body did not expand, proceeding with short page');
        }
      }

      // ── Step 2: Scroll to video area ────────────────────────────────
      await this._scrollToVideo(page);

      // ── Step 3: Wait for player to be ready ─────────────────────────
      try {
        await page.waitForFunction(
          () => {
            const video = document.querySelector('video');
            const artPlayer = document.querySelector('.art-video-player');
            const jwPlayer = document.querySelector('.jwplayer');
            if (video) return true;
            if (artPlayer) return true;
            if (jwPlayer && !jwPlayer.classList.contains('jw-state-idle')) return true;
            return (document.body?.innerText?.length || 0) > 500;
          },
          { timeout: 15000, polling: 500 }
        );
      } catch {
        // Timeout — proceed anyway
      }
      await page.waitForTimeout(1000);

      // ── Step 4: Set up new-tab capture BEFORE clicking play ─────────
      const capturedAdTabs = [];
      const newPageHandler = (newPage) => {
        console.log('[AdInteraction] New tab captured:', newPage.url());
        capturedAdTabs.push(newPage);
      };
      context.on('page', newPageHandler);

      // ── Step 5: Click play button ───────────────────────────────────
      const playClicked = await this._smartClickPlay(page, rule);
      if (!playClicked) {
        console.log('[AdInteraction] Could not click play button, trying JS play fallback');
        await this._jsPlayFallback(page);
      }

      // ── Step 6: Wait for new-tab ads to appear ──────────────────────
      // After clicking play on vids.st, ads pop up in new tabs after 1-3 seconds
      console.log('[AdInteraction] Waiting for ad tabs to appear...');
      await page.waitForTimeout(3000);

      // Remove the listener — we only want the initial burst of ad tabs
      context.off('page', newPageHandler);

      // ── Step 7: Handle captured ad tabs ─────────────────────────────
      if (capturedAdTabs.length > 0) {
        console.log(`[AdInteraction] ${capturedAdTabs.length} ad tab(s) captured, processing...`);
        await this._handleAdTabs(capturedAdTabs, page, rule);
      } else {
        console.log('[AdInteraction] No ad tabs captured, checking for in-page ads...');
        try {
          const adResult = await this.handleAdInteraction(page, rule);
          if (adResult.adShown && adResult.adClosed) {
            await page.waitForTimeout(1000);
            await this._smartClickPlay(page, rule);
          }
        } catch (adErr) {
          console.log('[AdInteraction] In-page ad handling skipped:', adErr.message);
        }
      }

      // ── Step 8: Handle verification / captcha on the main page ─────
      await this._handleMainPageVerification(page);

      // ── Step 9: Confirm video is actually playing ───────────────────
      const playConfirmed = await this._confirmVideoPlaying(page, rule);
      if (!playConfirmed) {
        console.log('[AdInteraction] Video not playing after ad handling, retrying play click...');
        await this._smartClickPlay(page, rule);
        await page.waitForTimeout(2000);
        await this._handleMainPageVerification(page);
        const retryConfirmed = await this._confirmVideoPlaying(page, rule);
        if (!retryConfirmed) {
          console.log('[AdInteraction] Video still not playing after retry');
        }
      }

      // ── Step 10: Wait for video to complete ─────────────────────────
      await this.waitForVideoComplete(page, rule.videoCompleteSelector);
      const duration = Date.now() - startTime;

      return { success: true, duration };
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[AdInteraction] playVideo error: ${err.message}`);
      return { success: false, duration, error: err.message };
    }
  }

  // ==========================================================================
  // New Tab Ad Handling
  // ==========================================================================

  /**
   * Handle multiple ad tabs that were captured from the play button click.
   * Processes each tab with human-like browsing simulation, then closes them.
   *
   * @param {import('playwright').Page[]} adTabs - Array of captured new tab pages
   * @param {import('playwright').Page} mainPage - The main video page (for focus restoration)
   * @param {object} rule - AdRule configuration
   */
  async _handleAdTabs(adTabs, mainPage, rule) {
    // Filter out about:blank pages — they are not real ad pages
    const realAdTabs = adTabs.filter(tab => {
      try {
        const url = tab.url();
        return url !== 'about:blank' && url !== '';
      } catch {
        return false;
      }
    });

    if (realAdTabs.length === 0 && adTabs.length > 0) {
      // All tabs are about:blank — close them silently
      console.log(`[AdInteraction] All ${adTabs.length} ad tabs are about:blank, closing silently`);
      for (const tab of adTabs) {
        try { await tab.close(); } catch { /* ignore */ }
      }
    } else {
      // Close about:blank tabs first
      for (const tab of adTabs) {
        try {
          if (tab.url() === 'about:blank' || tab.url() === '') {
            await tab.close();
          }
        } catch { /* ignore */ }
      }
    }

    for (let i = 0; i < realAdTabs.length; i++) {
      const adTab = realAdTabs[i];
      const tabLabel = `ad-tab-${i + 1}/${realAdTabs.length}`;

      try {
        await this._handleSingleAdTab(adTab, tabLabel, rule);
      } catch (err) {
        console.log(`[AdInteraction] ${tabLabel} handling error: ${err.message}`);
        // Force close if handling failed
        try { await adTab.close(); } catch { /* already closed */ }
      }
    }

    // Bring main page back to focus after all ad tabs are handled
    try {
      await mainPage.bringToFront();
      console.log('[AdInteraction] Switched focus back to main video page');
    } catch {
      // Page may have navigated
    }
  }

  /**
   * Handle a single ad tab with timeout retry.
   * Simulates human browsing behavior, handles captchas/popups, then closes.
   *
   * @param {import('playwright').Page} adTab - The ad tab page
   * @param {string} label - Label for logging
   * @param {object} rule - AdRule configuration
   */
  async _handleSingleAdTab(adTab, label, rule) {
    try {
      console.log(`[AdInteraction] ${label}: Processing ad page at ${adTab.url().substring(0, 80)}...`);

      // Wait a short time for the page to start loading — don't use waitForLoadState
      // as ad pages may never reach domcontentloaded due to redirects/tracking
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Simulate human browsing behavior (scroll + mouse move)
      await this._simulateHumanBrowsing(adTab, label);

      // Random stay time (5-12 seconds) to simulate reading
      const stayMs = this._randomInt(this.AD_STAY_MIN_MS, this.AD_STAY_MAX_MS);
      console.log(`[AdInteraction] ${label}: Staying for ${Math.round(stayMs / 1000)}s to simulate reading...`);
      await new Promise(resolve => setTimeout(resolve, stayMs));

      // Close the ad tab
      try {
        await adTab.close();
        console.log(`[AdInteraction] ${label}: Ad tab closed successfully`);
      } catch {
        console.log(`[AdInteraction] ${label}: Ad tab already closed`);
      }
    } catch (err) {
      console.log(`[AdInteraction] ${label}: Error: ${err.message}`);
      try { await adTab.close(); } catch { /* ignore */ }
    }
  }

  // ==========================================================================
  // Human Browsing Simulation
  // ==========================================================================

  /**
   * Simulate human-like browsing on an ad page.
   * Includes scrolling, mouse movements, and random pauses.
   *
   * @param {import('playwright').Page} page - The ad page
   * @param {string} label - Label for logging
   */
  async _simulateHumanBrowsing(page, label = 'ad') {
    try {
      // 1. Random mouse movements
      await this._simulateMouseMovements(page);

      // 2. Scrolling behavior
      await this._simulateScroll(page);

      // 3. Random pause (thinking time)
      const thinkMs = this._randomInt(1000, 3000);
      await page.waitForTimeout(thinkMs);

      // 4. More mouse movements
      await this._simulateMouseMovements(page);

      console.log(`[AdInteraction] ${label}: Human browsing simulation complete`);
    } catch (err) {
      console.log(`[AdInteraction] ${label}: Browsing simulation error: ${err.message}`);
    }
  }

  /**
   * Simulate natural mouse movements across the page.
   *
   * @param {import('playwright').Page} page
   */
  async _simulateMouseMovements(page) {
    try {
      const viewport = page.viewportSize();
      if (!viewport) return;

      const moveCount = this._randomInt(3, 8);
      for (let i = 0; i < moveCount; i++) {
        const x = this._randomInt(100, viewport.width - 100);
        const y = this._randomInt(100, viewport.height - 100);
        await page.mouse.move(x, y, { steps: this._randomInt(5, 15) });
        await page.waitForTimeout(this._randomInt(200, 800));
      }
    } catch {
      // Mouse movement may fail on closed pages
    }
  }

  /**
   * Simulate natural scrolling behavior (down then possibly up).
   *
   * @param {import('playwright').Page} page
   */
  async _simulateScroll(page) {
    try {
      // Scroll down in increments
      const scrollSteps = this._randomInt(2, 5);
      for (let i = 0; i < scrollSteps; i++) {
        const scrollAmount = this._randomInt(200, 600);
        await page.evaluate((amount) => {
          window.scrollBy({ top: amount, behavior: 'smooth' });
        }, scrollAmount);
        await page.waitForTimeout(this._randomInt(500, 1500));
      }

      // Sometimes scroll back up a bit
      if (Math.random() > 0.5) {
        await page.evaluate(() => {
          window.scrollBy({ top: -200, behavior: 'smooth' });
        });
        await page.waitForTimeout(500);
      }
    } catch {
      // Scroll may fail on some pages
    }
  }

  // ==========================================================================
  // Captcha & Verification Handling
  // ==========================================================================

  /**
   * Handle verification/captcha on ad pages.
   * Ad pages may contain their own verification popups.
   *
   * @param {import('playwright').Page} page - Ad page
   * @param {string} label - Label for logging
   */
  async _handleAdPageVerification(page, label = 'ad') {
    try {
      // Check for and close common popup/modal patterns on ad pages
      const closed = await page.evaluate(() => {
        const closedList = [];

        // Close common popup overlays
        const closeButtons = document.querySelectorAll(
          '[class*="close" i], [class*="dismiss" i], [class*="skip" i], ' +
          'button[aria-label*="close" i], button[aria-label*="Close" i], ' +
          '[id*="close" i], .modal-close, .popup-close'
        );

        for (const btn of closeButtons) {
          try {
            if (btn.offsetParent !== null) { // visible
              btn.click();
              closedList.push(btn.className || btn.id || 'unknown');
            }
          } catch { /* ignore */ }
        }

        return closedList;
      });

      if (closed.length > 0) {
        console.log(`[AdInteraction] ${label}: Closed popups: ${closed.join(', ')}`);
      }
    } catch (err) {
      console.log(`[AdInteraction] ${label}: Ad page verification handling error: ${err.message}`);
    }
  }

  /**
   * Handle verification/captcha on the main video page.
   * This handles:
   * - Math captcha (e.g., "5+5=?")
   * - "Are you human?" popup (Cancel/Allow buttons)
   * - Page redirects to verification pages
   *
   * @param {import('playwright').Page} page - Main video page
   */
  async _handleMainPageVerification(page) {
    try {
      // ── 1. Check for math captcha ─────────────────────────────────
      const captchaResult = await this._solveMathCaptcha(page);
      if (captchaResult.solved) {
        console.log(`[AdInteraction] Math captcha solved: "${captchaResult.question}" = ${captchaResult.answer}`);
        await page.waitForTimeout(2000);

        // After solving captcha, page may redirect or load video
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      }

      // ── 2. Check for "Are you human?" popup ───────────────────────
      await this._handleHumanVerificationPopup(page);

      // ── 3. Check if page has navigated to a verification URL ───────
      const currentUrl = page.url();
      if (currentUrl.includes('captcha') || currentUrl.includes('verify') || currentUrl.includes('check')) {
        console.log('[AdInteraction] Page redirected to verification URL, handling...');
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
        await this._solveMathCaptcha(page);
        await this._handleHumanVerificationPopup(page);
      }

      // ── 4. Handle any remaining overlay/modal ──────────────────────
      await this._dismissOverlays(page);

    } catch (err) {
      console.log(`[AdInteraction] Main page verification handling error: ${err.message}`);
    }
  }

  /**
   * Detect and solve math captchas on the page.
   * Looks for patterns like "5+5=?" or "What is 3 x 7?" and fills in the answer.
   *
   * @param {import('playwright').Page} page
   * @returns {Promise<{solved: boolean, question?: string, answer?: number|string}>}
   */
  async _solveMathCaptcha(page) {
    try {
      // Extract math expression from the page
      const captchaInfo = await page.evaluate(() => {
        const bodyText = document.body?.innerText || '';
        const bodyHtml = document.body?.innerHTML || '';

        // Pattern 1: Simple math expression like "5+5=?" or "5 + 5 = ?"
        const simpleMathRegex = /(\d+)\s*([+\-×xX*])\s*(\d+)\s*=\s*\?/g;
        let match = simpleMathRegex.exec(bodyText);
        if (match) {
          return { expression: `${match[1]}${match[2]}${match[3]}`, type: 'simple' };
        }

        // Pattern 2: "What is X + Y?" format
        const questionRegex = /what\s+is\s+(\d+)\s*([+\-×xX*])\s*(\d+)/i;
        match = questionRegex.exec(bodyText);
        if (match) {
          return { expression: `${match[1]}${match[2]}${match[3]}`, type: 'question' };
        }

        // Pattern 3: Look for captcha-specific elements
        const captchaElements = document.querySelectorAll(
          '[class*="captcha" i], [id*="captcha" i], [class*="verify" i], [id*="verify" i]'
        );
        for (const el of captchaElements) {
          const elText = el.innerText || el.textContent || '';
          const elMatch = simpleMathRegex.exec(elText);
          if (elMatch) {
            return { expression: `${elMatch[1]}${elMatch[2]}${elMatch[3]}`, type: 'captcha-element' };
          }
        }

        // Pattern 4: Check input placeholder for math hints
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
        for (const input of inputs) {
          const placeholder = input.placeholder || '';
          const label = input.getAttribute('aria-label') || '';
          const combinedText = placeholder + ' ' + label;
          const inputMatch = simpleMathRegex.exec(combinedText);
          if (inputMatch) {
            return { expression: `${inputMatch[1]}${inputMatch[2]}${inputMatch[3]}`, type: 'input-placeholder' };
          }
        }

        return { expression: null, type: null };
      });

      if (!captchaInfo.expression) {
        return { solved: false };
      }

      // Evaluate the math expression
      const answer = this._evaluateMathExpression(captchaInfo.expression);
      if (answer === null) {
        console.log(`[AdInteraction] Could not evaluate expression: ${captchaInfo.expression}`);
        return { solved: false };
      }

      console.log(`[AdInteraction] Math captcha detected (${captchaInfo.type}): ${captchaInfo.expression} = ${answer}`);

      // Fill in the answer
      const filled = await page.evaluate((ans) => {
        // Try to find the input field for the answer
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"]');
        for (const input of inputs) {
          if (input.offsetParent !== null) { // visible
            input.value = String(ans);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, answer);

      if (!filled) {
        console.log('[AdInteraction] Could not find input field for captcha answer');
        return { solved: false, question: captchaInfo.expression, answer };
      }

      // Click the submit/continue button
      await page.waitForTimeout(500);

      const submitted = await page.evaluate(() => {
        // Try various submit button selectors
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button:has-text("Continue")',
          'button:has-text("Submit")',
          'button:has-text("继续")',
          'button:has-text("继续进入")',
          'button:has-text("Verify")',
          'button:has-text("Go")',
          'a:has-text("Continue")',
          'a:has-text("继续")',
          '.submit-btn',
          '#submit-btn',
          'button.btn-primary',
        ];

        for (const sel of submitSelectors) {
          try {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) {
              el.click();
              return sel;
            }
          } catch { /* ignore */ }
        }

        // Try clicking any button that looks like a submit
        const buttons = document.querySelectorAll('button, input[type="submit"]');
        for (const btn of buttons) {
          const text = (btn.innerText || btn.value || '').toLowerCase();
          if (text.includes('continue') || text.includes('submit') || text.includes('go') ||
              text.includes('继续') || text.includes('verify') || text.includes('enter')) {
            if (btn.offsetParent !== null) {
              btn.click();
              return btn.innerText || btn.value;
            }
          }
        }

        return null;
      });

      if (submitted) {
        console.log(`[AdInteraction] Captcha submit button clicked: ${submitted}`);
      } else {
        // Try pressing Enter as fallback
        await page.keyboard.press('Enter');
        console.log('[AdInteraction] Pressed Enter as captcha submit fallback');
      }

      return { solved: true, question: captchaInfo.expression, answer };
    } catch (err) {
      console.log(`[AdInteraction] Math captcha solving error: ${err.message}`);
      return { solved: false };
    }
  }

  /**
   * Evaluate a simple math expression string.
   * Supports +, -, *, x, × operators.
   *
   * @param {string} expression - Math expression like "5+5" or "3x7"
   * @returns {number|null} The result, or null if evaluation failed
   */
  _evaluateMathExpression(expression) {
    try {
      // Normalize the expression
      const normalized = expression
        .replace(/×/g, '*')
        .replace(/x/gi, '*')
        .replace(/X/g, '*');

      // Validate: only allow digits, operators, and whitespace
      if (!/^[\d+\-*/\s.]+$/.test(normalized)) {
        return null;
      }

      // Use Function constructor for safe evaluation (no access to scope)
      const result = new Function(`return (${normalized})`)();

      if (typeof result === 'number' && isFinite(result)) {
        return Math.round(result); // Captcha answers are always integers
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Handle "Are you human?" verification popups.
   * Detects dialogs with Cancel/Allow buttons and clicks Allow/Continue.
   *
   * @param {import('playwright').Page} page
   */
  async _handleHumanVerificationPopup(page) {
    try {
      const handled = await page.evaluate(() => {
        const bodyText = document.body?.innerText || '';

        // Check for human verification popup text
        const isHumanPopup =
          bodyText.includes('Are you human') ||
          bodyText.includes('您是真人吗') ||
          bodyText.includes('verify your identity') ||
          bodyText.includes('验证您的身份') ||
          bodyText.includes('Are you a robot') ||
          bodyText.includes('Are you real');

        if (!isHumanPopup) return false;

        console.log('[AdInteraction] Human verification popup detected');

        // Try to click the Allow/Continue/Yes button
        const allowSelectors = [
          'button:has-text("Allow")',
          'button:has-text("Continue")',
          'button:has-text("Yes")',
          'button:has-text("允许")',
          'button:has-text("继续")',
          'button:has-text("确认")',
          'a:has-text("Allow")',
          'a:has-text("Continue")',
          'input[value="Allow"]',
          'input[value="Continue"]',
        ];

        for (const sel of allowSelectors) {
          try {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) {
              el.click();
              return sel;
            }
          } catch { /* ignore */ }
        }

        // Fallback: find buttons by text content
        const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
        for (const btn of buttons) {
          const text = (btn.innerText || btn.value || '').toLowerCase();
          if ((text.includes('allow') || text.includes('continue') || text.includes('yes') ||
               text.includes('允许') || text.includes('继续') || text.includes('确认')) &&
              btn.offsetParent !== null) {
            btn.click();
            return btn.innerText || btn.value;
          }
        }

        return false;
      });

      if (handled) {
        console.log(`[AdInteraction] Human verification popup handled: ${handled}`);
        await page.waitForTimeout(2000);
      }
    } catch (err) {
      console.log(`[AdInteraction] Human verification popup handling error: ${err.message}`);
    }
  }

  /**
   * Dismiss common overlay/modal elements on the page.
   *
   * @param {import('playwright').Page} page
   */
  async _dismissOverlays(page) {
    try {
      const dismissed = await page.evaluate(() => {
        const dismissedList = [];
        const closeSelectors = [
          '.ad-close', '.close-ad', '.dismiss', '.skip-ad', '.skip-btn',
          '[class*="close" i]:not(body):not(html)',
          'button[aria-label*="close" i]',
          'button[aria-label*="Close" i]',
          'button[aria-label*="dismiss" i]',
          '.modal-close', '.popup-close', '.overlay-close',
        ];

        for (const sel of closeSelectors) {
          try {
            const elements = document.querySelectorAll(sel);
            for (const el of elements) {
              if (el.offsetParent !== null) {
                el.click();
                dismissedList.push(sel);
              }
            }
          } catch { /* ignore */ }
        }

        return dismissedList;
      });

      if (dismissed.length > 0) {
        console.log(`[AdInteraction] Dismissed overlays: ${dismissed.join(', ')}`);
      }

      // Also try Escape key
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
    } catch {
      // ignore
    }
  }

  // ==========================================================================
  // Video Play Confirmation
  // ==========================================================================

  /**
   * Confirm that the video is actually playing on the page.
   * Checks both standard HTML5 video and ArtPlayer/JWPlayer states.
   *
   * @param {import('playwright').Page} page
   * @param {object} rule - AdRule configuration
   * @returns {Promise<boolean>} true if video is confirmed playing
   */
  async _confirmVideoPlaying(page, rule) {
    console.log('[AdInteraction] Checking if video is playing...');

    try {
      const isPlaying = await page.waitForFunction(
        () => {
          // Check HTML5 video element
          const video = document.querySelector('video');
          if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA or better
            if (!video.paused && !video.ended && video.currentTime > 0) {
              return true;
            }
          }

          // Check ArtPlayer (vids.st uses ArtPlayer 5.4.0)
          const artPlayer = document.querySelector('.art-video-player');
          if (artPlayer) {
            // ArtPlayer adds 'art-playing' class when video is playing
            if (artPlayer.classList.contains('art-playing')) return true;
            // Check if video inside artPlayer is playing
            const artVideo = artPlayer.querySelector('video');
            if (artVideo && !artVideo.paused && !artVideo.ended && artVideo.currentTime > 0) {
              return true;
            }
          }

          // Check JWPlayer state
          const jwPlayer = document.querySelector('.jwplayer');
          if (jwPlayer) {
            if (jwPlayer.classList.contains('jw-state-playing')) return true;
            if (!jwPlayer.classList.contains('jw-state-idle') && !jwPlayer.classList.contains('jw-state-paused')) {
              return true;
            }
          }

          return false;
        },
        { timeout: this.VIDEO_PLAY_CONFIRM_TIMEOUT, polling: 1000 }
      );

      if (isPlaying) {
        console.log('[AdInteraction] Video play confirmed!');
        return true;
      }
    } catch {
      console.log('[AdInteraction] Video play confirmation timed out');
    }

    return false;
  }

  // ==========================================================================
  // Legacy / In-Page Ad Handling (kept for backward compatibility)
  // ==========================================================================

  /**
   * Scroll to the video area on the page.
   * Many sites use lazy loading — the video player won't render until scrolled into view.
   * @param {import('playwright').Page} page
   */
  async _scrollToVideo(page) {
    try {
      await page.evaluate(() => {
        const selectors = [
          '.video-player', '.video-player-container', '.video-container',
          '.jwplayer', '#vplayer', '#player', '.player-container',
          '.art-video-player', '.artplayer-app', // ArtPlayer selectors
          'video', '.video', '.embed-responsive',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
        // Fallback: scroll down 500px
        window.scrollTo(0, 500);
      });
    } catch {
      // ignore scroll errors
    }
  }

  /**
   * Smart play button click - tries multiple strategies to find and click play.
   * Supports ArtPlayer, JWPlayer, and other common video players.
   *
   * @param {import('playwright').Page} page
   * @param {object} rule - AdRule configuration
   * @returns {Promise<boolean>} true if a play button was clicked
   */
  async _smartClickPlay(page, rule) {
    // Strategy 1: Use configured selector if provided
    if (rule.playButtonSelector) {
      try {
        const el = await page.waitForSelector(rule.playButtonSelector, { timeout: 10000 });
        if (el) {
          await el.click();
          console.log('[AdInteraction] Clicked play via configured selector:', rule.playButtonSelector);
          return true;
        }
      } catch {
        console.log('[AdInteraction] Configured selector not found, trying alternatives...');
      }
    }

    // Strategy 2: ArtPlayer-specific click (vids.st uses ArtPlayer 5.4.0)
    // IMPORTANT: Must use Playwright's page.click() instead of JS evaluate click,
    // because window.open() popups are only triggered by real user gestures.
    // JS element.click() does NOT trigger popup windows.
    try {
      // Try the big center play button first (triggers ad popups)
      const artCenterSelectors = [
        '.art-video-player .art-big-play',
        '.art-video-player .art-state-play',
        '.art-video-player .art-center-play',
        '.art-video-player .art-icon-play',
        '#player .art-big-play',
      ];

      for (const sel of artCenterSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            await el.click({ timeout: 5000 });
            console.log('[AdInteraction] Clicked ArtPlayer center play via Playwright:', sel);
            return true;
          }
        } catch {
          continue;
        }
      }

      // Fallback: Click the center of the video player area directly
      // This is important for vids.st — the center click triggers ad popups
      const playerContainer = await page.$('#player, .art-video-player');
      if (playerContainer) {
        const box = await playerContainer.boundingBox();
        if (box) {
          // Click near the center of the player
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          console.log('[AdInteraction] Clicked ArtPlayer center area via mouse');
          return true;
        }
      }

      // Last resort: JS evaluate click (won't trigger popups but will start playback)
      const artClicked = await page.evaluate(() => {
        const artPlayBtn = document.querySelector('.art-control-play, .art-video-player .art-icon-play');
        if (artPlayBtn) {
          artPlayBtn.click();
          return 'art-control-play-js';
        }
        const artContainer = document.querySelector('.art-video-player');
        if (artContainer) {
          artContainer.click();
          return 'art-video-player-click-js';
        }
        return null;
      });
      if (artClicked) {
        console.log('[AdInteraction] Clicked ArtPlayer play via JS fallback:', artClicked);
        return true;
      }
    } catch {
      // ignore
    }

    // Strategy 3: JWPlayer-specific click via JavaScript
    try {
      const jwClicked = await page.evaluate(() => {
        const selectors = [
          '.jw-icon-playback',
          '.jw-display-icon-container',
          '.jw-icon-display',
          '.jwplayer .jw-display-icon',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            el.click();
            return sel;
          }
        }
        if (typeof jwplayer === 'function') {
          try {
            const p = jwplayer();
            if (p && typeof p.play === 'function') {
              p.play();
              return 'jwplayer-api';
            }
          } catch { /* ignore */ }
        }
        return null;
      });
      if (jwClicked) {
        console.log('[AdInteraction] Clicked JWPlayer play via JS:', jwClicked);
        return true;
      }
    } catch {
      // ignore
    }

    // Strategy 4: Other common video player play buttons
    const commonPlaySelectors = [
      '.vjs-big-play-button',                     // Video.js
      '.ytp-play-button',                         // YouTube-like
      '.play-btn', '.play-button', '#play-btn', '#play-button',
      'button[aria-label*="play" i]',
      'button[aria-label*="Play" i]',
      'button[title*="Play" i]',
      'a[title*="Play" i]',
    ];

    for (const selector of commonPlaySelectors) {
      try {
        const el = await page.$(selector);
        if (el && await el.isVisible()) {
          await el.click();
          console.log('[AdInteraction] Clicked play via selector:', selector);
          return true;
        }
      } catch {
        continue;
      }
    }

    // Strategy 5: Click the video element itself
    try {
      const videoEl = await page.$('video');
      if (videoEl) {
        await videoEl.click();
        console.log('[AdInteraction] Clicked video element directly');
        return true;
      }
    } catch {
      // ignore
    }

    // Strategy 6: Click inside iframes
    try {
      const frames = page.frames();
      for (const frame of frames) {
        if (frame === page.mainFrame()) continue;
        for (const selector of ['.play-btn', '.play-button', '.jw-icon-playback', '.vjs-big-play-button', 'video', '.art-control-play']) {
          try {
            const el = await frame.$(selector);
            if (el) {
              await el.click();
              console.log('[AdInteraction] Clicked play in iframe via:', selector);
              return true;
            }
          } catch {
            continue;
          }
        }
      }
    } catch {
      // iframe access may be blocked by CORS
    }

    return false;
  }

  /**
   * JavaScript-based play fallback.
   * Tries to play video elements and trigger ArtPlayer/JWPlayer API.
   * @param {import('playwright').Page} page
   */
  async _jsPlayFallback(page) {
    try {
      await page.evaluate(() => {
        // Try standard video element
        const video = document.querySelector('video');
        if (video && video.paused) {
          video.play().catch(() => {});
        }

        // Try ArtPlayer API (vids.st)
        if (typeof art !== 'undefined' && art && typeof art.play === 'function') {
          try { art.play(); } catch { /* ignore */ }
        }
        // ArtPlayer instance via global
        const artInstance = window.art || window.artplayer;
        if (artInstance && typeof artInstance.play === 'function') {
          try { artInstance.play(); } catch { /* ignore */ }
        }

        // Try JWPlayer API
        if (typeof jwplayer === 'function') {
          try {
            const player = jwplayer();
            if (player && typeof player.play === 'function') {
              player.play();
            }
          } catch { /* ignore */ }
        }

        // Try clicking ArtPlayer controls
        const artPlayBtn = document.querySelector('.art-control-play, .art-icon-play');
        if (artPlayBtn) {
          artPlayBtn.click();
        }

        // Try clicking JWPlayer controls
        const jwBtn = document.querySelector('.jw-icon-playback');
        if (jwBtn) {
          jwBtn.click();
        }
        const displayIcon = document.querySelector('.jw-display-icon-container');
        if (displayIcon) {
          displayIcon.click();
        }
      });
      console.log('[AdInteraction] Triggered JS play fallback');
    } catch {
      console.log('[AdInteraction] JS play fallback failed');
    }
  }

  /**
   * Fallback Cloudflare challenge handler (when browserService not injected).
   * @param {import('playwright').Page} page
   */
  async _handleCloudflareFallback(page) {
    try {
      const isCF = await page.evaluate(() => {
        const t = document.body?.innerText || '';
        return t.includes('Just a moment') || t.includes('Checking your browser');
      });
      if (!isCF) return;

      console.log('[AdInteraction] CF challenge detected (fallback), waiting...');
      const timeout = 60000;
      const start = Date.now();
      while (Date.now() - start < timeout) {
        await page.waitForTimeout(2000);
        const done = await page.evaluate(() => {
          const t = document.body?.innerText || '';
          return !t.includes('Just a moment') && !t.includes('Checking your browser');
        });
        if (done) {
          await page.waitForTimeout(2000);
          return;
        }
      }
    } catch {
      // ignore
    }
  }

  /**
   * Handle in-page ad interaction (legacy, for sites that use iframe ads instead of new tabs).
   * @param {import('playwright').Page} page
   * @param {object} rule - AdRule configuration
   * @returns {Promise<{adShown: boolean, adClosed: boolean, duration: number}>}
   */
  async handleAdInteraction(page, rule) {
    const startTime = Date.now();

    // Check if ad container exists (short timeout)
    let adContainer = null;
    try {
      const adSelectors = [
        '.ad-container', '.ad-wrapper', '[class*="ad-"]',
        'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
        'iframe[id*="google_ads"]', '[id*="google_ads"]',
        '.video-ad', '.preroll', '.overlay',
        '.adsbox_adunit', '#adsbox_adunit_687521',
      ].join(', ');

      adContainer = await page.waitForSelector(adSelectors, {
        timeout: 5000,
      });
    } catch {
      // No ad detected within timeout
      return { adShown: false, adClosed: false, duration: Date.now() - startTime };
    }

    if (!adContainer) {
      return { adShown: false, adClosed: false, duration: Date.now() - startTime };
    }

    console.log('[AdInteraction] In-page ad container detected');
    await this.waitForAdCompletion(page, rule);
    await this.closeAd(page, rule);

    return { adShown: true, adClosed: true, duration: Date.now() - startTime };
  }

  /**
   * Wait for ad to complete based on rule configuration.
   * @param {import('playwright').Page} page
   * @param {object} rule - AdRule with adWaitMinSec and adWaitMaxSec
   */
  async waitForAdCompletion(page, rule) {
    const waitMin = (rule.adWaitMinSec || 5) * 1000;
    const waitMax = (rule.adWaitMaxSec || 15) * 1000;
    const waitTime = Math.random() * (waitMax - waitMin) + waitMin;
    await page.waitForTimeout(waitTime);
  }

  /**
   * Close an ad based on the rule configuration.
   * @param {import('playwright').Page} page
   * @param {object} rule - AdRule with adCloseMode and adCloseSelector
   */
  async closeAd(page, rule) {
    const closeMode = rule.adCloseMode || 'auto';

    if (closeMode === 'selector' && rule.adCloseSelector) {
      try {
        await page.waitForSelector(rule.adCloseSelector, { timeout: 5000 });
        await page.click(rule.adCloseSelector);
        return;
      } catch {
        console.log('[AdInteraction] Close selector not found, trying alternatives');
      }
    }

    const closeSelectors = [
      '.ad-close', '.close-ad', '.dismiss', '.skip-ad', '.skip-btn',
      '[class*="close"]', '[class*="skip"]',
      'button[aria-label*="close" i]', 'button[aria-label*="Close" i]',
      'button[aria-label*="Skip" i]',
    ];

    for (const sel of closeSelectors) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) {
          await el.click();
          console.log('[AdInteraction] Closed ad via:', sel);
          return;
        }
      } catch {
        continue;
      }
    }

    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    } catch {
      // ignore
    }

    await page.waitForTimeout(3000);
  }

  /**
   * Wait for the video to complete playing.
   * Supports ArtPlayer, JWPlayer state detection, and standard video ended events.
   *
   * @param {import('playwright').Page} page
   * @param {string} selector - CSS selector indicating video completion
   */
  async waitForVideoComplete(page, selector) {
    if (!selector) {
      try {
        await page.waitForFunction(
          () => {
            // Check standard video element
            const video = document.querySelector('video');
            if (video) {
              if (video.ended) return true;
              if (video.duration > 0 && video.currentTime > 0) {
                return false;
              }
            }
            // Check ArtPlayer
            const artPlayer = document.querySelector('.art-video-player');
            if (artPlayer) {
              // ArtPlayer doesn't have a 'complete' class by default,
              // but we can check the video inside it
              const artVideo = artPlayer.querySelector('video');
              if (artVideo && artVideo.ended) return true;
            }
            // Check JWPlayer complete state
            const jwPlayer = document.querySelector('.jwplayer');
            if (jwPlayer) {
              return jwPlayer.classList.contains('jw-state-complete');
            }
            return false;
          },
          { timeout: 600000 } // 10 min max wait
        );
        console.log('[AdInteraction] Video playback completed');
      } catch {
        console.log('[AdInteraction] Video completion wait timed out, assuming done');
        await page.waitForTimeout(5000);
      }
      return;
    }

    try {
      await page.waitForSelector(selector, { timeout: 600000 });
    } catch {
      await page.waitForTimeout(30000);
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Generate a random integer in [min, max] (inclusive).
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  _randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
