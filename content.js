// ─── TikTok DM Sticker Scanner (Content Script) ───────────────────────────
// Scans the current DM conversation page for sticker images AND GIF/animated stickers.
// Catches: <img>, <video>, CSS backgrounds, <picture>/<source>, and embedded JSON.

(() => {
  // Default pattern that matches TikTok DM sticker CDN URLs
  // Example: https://p16-tiktok-dm-sticker-sign-sg.ibyteimg.com/tos-alisg-i-dhq7zx4c1p-sg/...awebp
  const DEFAULT_PATTERN = "tiktok-dm-sticker";

  /**
   * Checks if a URL looks like a TikTok DM sticker (static or animated/GIF).
   * Matches against the user-configured pattern and common sticker indicators.
   */
  function isStickerUrl(url, pattern) {
    if (!url || typeof url !== "string") return false;

    const lowerUrl = url.toLowerCase();

    // Must match user-configured pattern (default: "tiktok-dm-sticker")
    if (pattern && lowerUrl.includes(pattern.toLowerCase())) {
      return true;
    }

    // Fallback heuristics: match common sticker CDN patterns
    const isIbyteimg = lowerUrl.includes("ibyteimg.com");
    const hasStickerPath =
      lowerUrl.includes("sticker") ||
      lowerUrl.includes("dhq7zx4c1p") ||
      lowerUrl.includes("dm-sticker") ||
      lowerUrl.includes("dm_sticker") ||
      lowerUrl.includes("emoji") ||
      lowerUrl.includes("effect");

    // Supported sticker formats: static (webp/png) + animated (gif/mp4/webm)
    const isStickerFormat =
      lowerUrl.includes(".awebp") ||
      lowerUrl.includes(".webp") ||
      lowerUrl.includes(".png") ||
      lowerUrl.includes(".gif") ||
      lowerUrl.includes(".mp4") ||
      lowerUrl.includes(".webm");

    return isIbyteimg && hasStickerPath && isStickerFormat;
  }

  /**
   * Determines if a sticker URL points to an animated/GIF sticker.
   */
  function isAnimatedSticker(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes(".gif") ||
      lower.includes(".mp4") ||
      lower.includes(".webm") ||
      // Animated webp stickers often have "anim" in the path
      lower.includes("anim") ||
      lower.includes("gif")
    );
  }

  /**
   * Extracts a unique key from a sticker URL by stripping query params
   * so we can deduplicate stickers.
   */
  function getStickerKey(url) {
    try {
      const u = new URL(url);
      // Keep just the pathname as the unique identifier
      return u.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Adds a sticker URL to the map if it's new.
   * Stores metadata about the sticker type (static vs animated).
   */
  function addSticker(stickers, url) {
    const key = getStickerKey(url);
    if (!stickers.has(key)) {
      stickers.set(key, {
        url: url,
        type: isAnimatedSticker(url) ? "animated" : "static",
      });
    }
  }

  /**
   * Scans the DOM for all sticker images AND animated stickers (GIFs/videos).
   */
  function scanForStickers(pattern) {
    const stickers = new Map(); // key -> { url, type }

    // ── Strategy 1: Scan all <img> elements ──────────────────────────────
    const images = document.querySelectorAll("img");
    for (const img of images) {
      const candidates = [
        img.src,
        img.getAttribute("data-src"),
        img.getAttribute("data-original"),
        img.getAttribute("data-fallback"),
      ];

      for (const src of candidates) {
        if (src && isStickerUrl(src, pattern)) {
          addSticker(stickers, src);
        }
      }

      // Also check srcset
      const srcset = img.srcset || img.getAttribute("data-srcset");
      if (srcset) {
        const urls = srcset.split(",").map((s) => s.trim().split(/\s+/)[0]);
        for (const u of urls) {
          if (isStickerUrl(u, pattern)) {
            addSticker(stickers, u);
          }
        }
      }
    }

    // ── Strategy 2: Scan all <video> elements (animated/GIF stickers) ────
    // TikTok often renders animated stickers as <video> in DMs
    const videos = document.querySelectorAll("video");
    for (const video of videos) {
      const candidates = [
        video.src,
        video.getAttribute("data-src"),
        video.currentSrc,
        video.poster, // poster frame is also a sticker image
      ];

      for (const src of candidates) {
        if (src && isStickerUrl(src, pattern)) {
          addSticker(stickers, src);
        }
      }

      // Check <source> children of <video>
      const sources = video.querySelectorAll("source");
      for (const source of sources) {
        const srcUrl = source.src || source.getAttribute("data-src");
        if (srcUrl && isStickerUrl(srcUrl, pattern)) {
          addSticker(stickers, srcUrl);
        }
      }
    }

    // ── Strategy 3: Scan CSS background-image on all elements ────────────
    // (TikTok sometimes renders stickers as background images)
    const allElements = document.querySelectorAll("[style*='background']");
    for (const el of allElements) {
      const style = el.style.backgroundImage || "";
      const match = style.match(/url\(["']?(.*?)["']?\)/);
      if (match && match[1] && isStickerUrl(match[1], pattern)) {
        addSticker(stickers, match[1]);
      }
    }

    // ── Strategy 4: Scan <source> elements inside <picture> tags ─────────
    const pictureSources = document.querySelectorAll("picture source");
    for (const src of pictureSources) {
      const srcUrl = src.srcset || src.src;
      if (srcUrl && isStickerUrl(srcUrl, pattern)) {
        addSticker(stickers, srcUrl);
      }
    }

    // ── Strategy 5: Check embedded JSON data for sticker URLs ────────────
    const scripts = document.querySelectorAll('script[type="application/json"]');
    for (const script of scripts) {
      try {
        const text = script.textContent;
        // Search for sticker URLs in the JSON text using regex
        // Matches both image stickers and GIF/video stickers
        const urlRegex =
          /https?:\/\/[^"'\s]+(?:sticker|dhq7zx4c1p|dm-sticker|dm_sticker|emoji|effect)[^"'\s]*/gi;
        const matches = text.match(urlRegex);
        if (matches) {
          for (const url of matches) {
            // Clean up any trailing characters
            const cleanUrl = url.replace(/[\\",})\]]+$/, "");
            if (isStickerUrl(cleanUrl, pattern)) {
              addSticker(stickers, cleanUrl);
            }
          }
        }
      } catch (e) {
        // Skip unparseable scripts
      }
    }

    // ── Strategy 6: Scan any <a> links pointing to sticker files ─────────
    const links = document.querySelectorAll("a[href]");
    for (const link of links) {
      const href = link.href;
      if (href && isStickerUrl(href, pattern)) {
        addSticker(stickers, href);
      }
    }

    // Build response with type info
    const results = Array.from(stickers.values());
    console.log(
      `[TikTok Sticker Saver] Breakdown: ${results.filter((s) => s.type === "static").length} static, ` +
        `${results.filter((s) => s.type === "animated").length} animated`
    );

    return results;
  }

  // ─── Message handler ──────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "scanStickers") {
      const pattern = message.pattern || DEFAULT_PATTERN;
      console.log(`[TikTok Sticker Saver] Scanning with pattern: "${pattern}"`);

      const results = scanForStickers(pattern);
      console.log(`[TikTok Sticker Saver] Found ${results.length} sticker(s)`);

      sendResponse({ stickers: results });
    }

    if (message.action === "ping") {
      sendResponse({ ok: true });
    }

    return true; // Keep message channel open for async
  });

  console.log("[TikTok Sticker Saver] Content script loaded ✓ (with GIF support)");
})();
