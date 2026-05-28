// ─── Background Service Worker ─────────────────────────────────────────
// Handles downloading sticker files (images + GIFs/videos) via chrome.downloads API.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadSticker") {
    const { url, filename } = message;

    chrome.downloads.download(
      {
        url: url,
        filename: `tiktok-stickers/${filename}`,
        saveAs: false,
        conflictAction: "uniquify",
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error(
            `[TikTok Sticker Saver] Download failed: ${chrome.runtime.lastError.message}`
          );
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      }
    );

    return true; // async response
  }

  if (message.action === "downloadAll") {
    const { urls } = message;
    let completed = 0;
    let failed = 0;

    const downloadNext = (index) => {
      if (index >= urls.length) {
        sendResponse({ success: true, completed, failed });
        return;
      }

      const url = urls[index];
      const filename = generateFilename(url, index);

      chrome.downloads.download(
        {
          url: url,
          filename: `tiktok-stickers/${filename}`,
          saveAs: false,
          conflictAction: "uniquify",
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error(
              `[TikTok Sticker Saver] Failed #${index}: ${chrome.runtime.lastError.message}`
            );
            failed++;
          } else {
            completed++;
          }

          // Send progress update
          chrome.runtime.sendMessage({
            action: "downloadProgress",
            current: index + 1,
            total: urls.length,
            completed,
            failed,
          }).catch(() => {}); // Popup might be closed

          // Small delay between downloads to avoid rate limiting
          setTimeout(() => downloadNext(index + 1), 200);
        }
      );
    };

    downloadNext(0);
    return true; // async response
  }
});

/**
 * Generates a clean filename from a sticker URL.
 * Detects format from URL to preserve GIFs as .gif, videos as .mp4, etc.
 */
function generateFilename(url, index) {
  try {
    const u = new URL(url);
    const pathParts = u.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    const lowerPath = u.pathname.toLowerCase();

    // Extract the hash/ID from the filename
    const match = lastPart.match(/([a-f0-9]{20,})/i);
    const id = match ? match[1].substring(0, 12) : `sticker_${index + 1}`;

    // Determine extension — order matters (check specific formats first)
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
