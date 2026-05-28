# TikTok Sticker Saver — Chrome Extension

A browser extension that downloads all stickers from a TikTok DM conversation.

## How It Works

Since TikTok doesn't expose saved stickers on the web version, the workaround is:
1. **On mobile** → send all your saved stickers into a DM conversation
2. **On desktop** → open that DM, and the extension scans for sticker images and downloads them all

The extension identifies stickers by their CDN URL pattern (e.g. `tiktok-dm-sticker` in `p16-tiktok-dm-sticker-sign-sg.ibyteimg.com`). This pattern is **configurable** in the extension popup since it may differ per region.

---

## Installation

1. Open **Chrome** → go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the folder:
   ```
   C:\Users\mateu\.gemini\antigravity\scratch\tiktok-sticker-downloader
   ```
5. The extension icon will appear in your toolbar

---

## Usage

### Step 1 — Prepare stickers (mobile)
Open TikTok on your phone, go to **Create → Stickers → Favorites**, and send each sticker into a DM conversation with someone (or yourself via a group you create).

### Step 2 — Open DM on desktop
Navigate to `https://www.tiktok.com/messages` and open the conversation containing your stickers.

### Step 3 — Scroll to load all stickers
Scroll up through the conversation so that **all sticker images are loaded** in the browser. The extension can only find images that are rendered in the page.

### Step 4 — Scan & Download
1. Click the **Sticker Saver** extension icon
2. Click **Scan Stickers** — it will find all sticker images on the page
3. Preview what it found in the grid
4. Click **Download All** — stickers are saved to your `Downloads/tiktok-stickers/` folder

---

## Configuration

Click the **⚙ URL Pattern Config** section in the popup to change the sticker URL matching pattern.

| Setting | Default | Description |
|---------|---------|-------------|
| **Sticker CDN domain pattern** | `tiktok-dm-sticker` | Text that must appear in the URL for it to be recognized as a sticker |

> [!TIP]  
> If the default pattern doesn't find your stickers, right-click a sticker image in the DM → **Copy image address** → look for the unique part of the domain and paste that as the pattern.

---

## Project Structure

```
tiktok-sticker-downloader/
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Service worker — handles downloads
├── content.js         # Content script — scans DM page for sticker images
├── popup.html         # Extension popup UI
├── popup.css          # Dark theme styles
├── popup.js           # Popup logic — orchestrates scan + download
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

> [!WARNING]
> This extension is for **personal use only**. Automated scraping may violate TikTok's Terms of Service. Sticker URLs contain expiration signatures — download them before they expire.
