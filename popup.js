// ─── Popup Controller ──────────────────────────────────────────────────

const DEFAULT_PATTERN = "tiktok-dm-sticker";
let foundStickers = []; // Array of { url, type } objects

// ─── DOM references ────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const statusText = $("statusText");
const notOnTiktok = $("notOnTiktok");
const instructions = $("instructions");
const results = $("results");
const preview = $("preview");
const stickerCount = $("stickerCount");
const scanBtn = $("scanBtn");
const downloadAllBtn = $("downloadAllBtn");
const dlCount = $("dlCount");
const clearBtn = $("clearBtn");
const progressWrap = $("progressWrap");
const progressFill = $("progressFill");
const progressText = $("progressText");
const urlPatternInput = $("urlPattern");
const saveConfigBtn = $("saveConfig");

// ─── Init ──────────────────────────────────────────────────────────────
async function init() {
  // Load saved pattern
  const stored = await chrome.storage.local.get(["stickerPattern"]);
  urlPatternInput.value = stored.stickerPattern || DEFAULT_PATTERN;

  // Check if we're on TikTok
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes("tiktok.com")) {
    notOnTiktok.classList.remove("hidden");
    scanBtn.disabled = true;
    return;
  }

  scanBtn.disabled = false;
}

init();

// ─── Save config ───────────────────────────────────────────────────────
saveConfigBtn.addEventListener("click", async () => {
  const pattern = urlPatternInput.value.trim();
  await chrome.storage.local.set({ stickerPattern: pattern || DEFAULT_PATTERN });
  showStatus("success", "Config saved!");
  setTimeout(() => hideStatus(), 2000);
});

// ─── Scan button ───────────────────────────────────────────────────────
scanBtn.addEventListener("click", async () => {
  scanBtn.disabled = true;
  scanBtn.innerHTML = `<div class="spinner"></div> Scanning...`;
  showStatus("info", "Scanning DM for stickers & GIFs...");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pattern = urlPatternInput.value.trim() || DEFAULT_PATTERN;

    // First try to ping the content script
    let contentScriptReady = false;
    try {
      const pong = await chrome.tabs.sendMessage(tab.id, { action: "ping" });
      contentScriptReady = pong && pong.ok;
    } catch {
      contentScriptReady = false;
    }

    // If content script isn't injected yet, inject it
    if (!contentScriptReady) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      // Small delay to let it initialize
      await new Promise((r) => setTimeout(r, 300));
    }

    // Send scan request
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "scanStickers",
      pattern: pattern,
    });

    if (response && response.stickers && response.stickers.length > 0) {
      foundStickers = response.stickers;
      showResults(foundStickers);

      const staticCount = foundStickers.filter((s) => s.type === "static").length;
      const animCount = foundStickers.filter((s) => s.type === "animated").length;

      let msg = `Found ${foundStickers.length} sticker(s)`;
      if (animCount > 0 && staticCount > 0) {
        msg += ` — ${staticCount} static, ${animCount} GIF`;
      } else if (animCount > 0) {
        msg += ` — all GIFs`;
      }
      showStatus("success", msg);
    } else {
      showStatus(
        "error",
        "No stickers found. Make sure stickers are visible on screen & scroll through the chat."
      );
      foundStickers = [];
    }
  } catch (err) {
    console.error(err);
    showStatus("error", `Scan failed: ${err.message}`);
  }

  scanBtn.disabled = false;
  scanBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    Scan Stickers
  `;
});

// ─── Download all ──────────────────────────────────────────────────────
downloadAllBtn.addEventListener("click", async () => {
  if (foundStickers.length === 0) return;

  downloadAllBtn.disabled = true;
  scanBtn.disabled = true;
  progressWrap.classList.remove("hidden");

  const total = foundStickers.length;
  let completed = 0;
  let failed = 0;

  showStatus("info", "Downloading stickers & GIFs...");

  // Download one by one with small delays
  for (let i = 0; i < foundStickers.length; i++) {
    const sticker = foundStickers[i];
    const url = sticker.url;
    const filename = generateFilename(url, i);

    try {
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: "downloadSticker",
            url: url,
            filename: filename,
          },
          (response) => {
            if (response && response.success) {
              completed++;
            } else {
              failed++;
            }
            resolve();
          }
        );
      });
    } catch {
      failed++;
    }

    // Update progress
    const progress = ((i + 1) / total) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${i + 1} / ${total}`;

    // Small delay between downloads
    if (i < foundStickers.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (failed === 0) {
    showStatus("success", `All ${completed} stickers downloaded!`);
  } else {
    showStatus("error", `Downloaded ${completed}, failed ${failed}`);
  }

  downloadAllBtn.disabled = false;
  scanBtn.disabled = false;
});

// ─── Clear results ─────────────────────────────────────────────────────
clearBtn.addEventListener("click", () => {
  foundStickers = [];
  results.classList.add("hidden");
  downloadAllBtn.classList.add("hidden");
  progressWrap.classList.add("hidden");
  progressFill.style.width = "0%";
  hideStatus();
});

// ─── Listen for download progress from background ─────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "downloadProgress") {
    const progress = (message.current / message.total) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${message.current} / ${message.total}`;
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Checks if a URL is a video/animated format.
 */
function isVideoUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes(".mp4") || lower.includes(".webm") || lower.includes(".gif");
}

/**
 * Shows scan results in the preview grid.
 * Uses <img> for static stickers and <video> for animated/GIF stickers.
 */
function showResults(stickers) {
  preview.innerHTML = "";
  stickerCount.textContent = stickers.length;
  dlCount.textContent = stickers.length;

  stickers.forEach((sticker, i) => {
    const div = document.createElement("div");
    div.className = "preview-item";
    const typeLabel = sticker.type === "animated" ? "GIF" : "IMG";
    div.title = `Sticker ${i + 1} (${typeLabel})`;

    // Add a small type badge
    if (sticker.type === "animated") {
      const badge = document.createElement("div");
      badge.className = "type-badge gif";
      badge.textContent = "GIF";
      div.appendChild(badge);
    }

    const url = sticker.url;

    if (isVideoUrl(url)) {
      // Render as auto-playing muted video for preview
      const video = document.createElement("video");
      video.src = url;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "contain";
      video.onerror = () => {
        div.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#555;font-size:10px;">${i + 1}</div>`;
      };
      div.appendChild(video);
    } else {
      // Render as image (works for webp, png, gif, awebp)
      const img = document.createElement("img");
      img.src = url;
      img.alt = `Sticker ${i + 1}`;
      img.loading = "lazy";
      img.onerror = () => {
        div.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#555;font-size:10px;">${i + 1}</div>`;
      };
      div.appendChild(img);
    }

    preview.appendChild(div);
  });

  results.classList.remove("hidden");
  downloadAllBtn.classList.remove("hidden");
  instructions.classList.add("hidden");
}

function showStatus(type, text) {
  statusEl.className = `status ${type}`;
  statusText.textContent = text;
  statusEl.classList.remove("hidden");
}

function hideStatus() {
  statusEl.classList.add("hidden");
}

function generateFilename(url, index) {
  try {
    const u = new URL(url);
    const pathParts = u.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    const lowerPath = u.pathname.toLowerCase();

    const match = lastPart.match(/([a-f0-9]{20,})/i);
    const id = match ? match[1].substring(0, 12) : `sticker_${index + 1}`;

    // Determine extension — check specific animated formats first
    let ext = ".webp";
    if (lowerPath.includes(".gif")) ext = ".gif";
    else if (lowerPath.includes(".mp4")) ext = ".mp4";
    else if (lowerPath.includes(".webm")) ext = ".webm";
    else if (lowerPath.includes(".png")) ext = ".png";
    else if (lowerPath.includes(".jpg") || lowerPath.includes(".jpeg")) ext = ".jpg";
    else if (lowerPath.includes(".awebp") || lowerPath.includes(".webp")) ext = ".webp";

    return `sticker_${String(index + 1).padStart(3, "0")}_${id}${ext}`;
  } catch {
    return `sticker_${String(index + 1).padStart(3, "0")}.webp`;
  }
}
