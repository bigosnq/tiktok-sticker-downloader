# 🎬 TikTok Sticker Downloader (v1.2)

A powerful, light-weight Chrome extension and local automation utility designed to **bulk download static and animated stickers/GIFs** from TikTok Direct Message (DM) conversations, and convert them to true `.gif` animations that play natively on **iOS / iPhone camera roll and Photos app**.

---

## ✨ Features

- 🔍 **Advanced DM Scanning**: Traverses the DOM of a TikTok DM conversation to identify and extract images, videos, background styles, and complex picture wrappers.
- 📺 **Looping Live Previews**: Renders animated stickers as auto-playing, looping, and muted video frames inside a modern glassmorphism grid popup.
- ⚡ **Rate-Limit Safe Downloads**: Downloads stickers sequentially with micro-delays to prevent triggering security blocks.
- 📁 **Automated Python Batch-Converter**: Includes `convert.py` which automatically grabs downloads, moves them locally into your project directory, and encodes animated WebPs into fully transparent standard animated GIFs.
- 📱 **Native iOS Compatibility**: Prepares files perfectly to prevent iOS from flattening your sticker files into static images when saving to the Photos app.

---

## 🛠️ Project Structure

```
tiktok-sticker-downloader/
├── manifest.json       # Manifest V3 Extension Configuration
├── background.js      # Background service worker (downloads orchestrator)
├── content.js         # Content scanner (DOM parsing and URL detection)
├── popup.html         # Elegant dark-mode controller popup interface
├── popup.css          # Premium TikTok-inspired neon glassmorphism stylesheet
├── popup.js           # Controller connecting UI actions to the background worker
├── convert.py         # Automated local Python importer & GIF encoder
├── README.md          # Project documentation (this file)
└── icons/             # App icons (16x16, 48x48, 128x128)
```

---

## 🚀 Setup & Installation

### Part 1: Install the Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select your `tiktok-sticker-downloader` folder.
5. The extension is now successfully installed! Click the puzzle piece icon in your Chrome toolbar and pin **TikTok Sticker Saver**.

### Part 2: Install Python (For iPhone conversion)
1. Make sure you have Python 3 installed on your computer.
2. The `convert.py` script automatically manages its own dependencies (`Pillow`) upon its first run.

---

## 📖 Step-by-Step Usage Guide

Follow these steps to successfully scrape your stickers and move them onto your iPhone as looping animations:

### Step 1: Send the Stickers in a DM
TikTok does not provide a web interface for managing "Saved/Favorite" stickers.
- Open the TikTok mobile app on your phone.
- Send all the stickers you want to download to a friend, a secondary account, or a group chat.

### Step 2: Scan & Download on Desktop
1. Open your browser and go to [tiktok.com](https://www.tiktok.com) (make sure you are logged in).
2. Go to your **Direct Messages (DMs)** and click on the conversation containing the stickers.
3. **Scroll up** through the chat history to ensure all sticker elements are loaded in the page.
4. Click the **TikTok Sticker Saver** extension icon in your toolbar.
5. Click **Scan Stickers**.
6. Review the list of loaded stickers in the looping preview grid.
7. Click **Download All**. A folder named `tiktok-stickers` will be created in your system `Downloads` directory.

### Step 3: Run the Local Batch-Converter
If you want to move these animations to an iPhone, they must be standard animated GIFs (otherwise, iOS will flatten them to a static picture).
1. Open your terminal/command prompt and navigate to the project directory, or simply execute the script:
   ```bash
   python convert.py
   ```
2. The script will automatically:
   * Scan your system `Downloads` folder for the newly downloaded stickers.
   * Automatically import and copy them into your local project directory under `tiktok-stickers/`.
   * Batch-convert all animated WebPs into fully transparent standard `.gif` files.
   * Save the converted results inside the `tiktok-stickers-gifs/` folder.

### Step 4: Import to iPhone Camera Roll
1. Locate the newly created `tiktok-stickers-gifs/` folder inside your project directory.
2. **Right-click** it and compress it into a **ZIP archive** (e.g. `tiktok-stickers-gifs.zip`).
3. Send this ZIP file to your iPhone using **iCloud Drive, Google Drive, Email, or AirDrop**.
4. On your iPhone, open the native **Files** app:
   * Tap on the ZIP file to extract it into a folder.
   * Open the folder, tap the **three dots (...)** in the top-right corner, and choose **Select**.
   * Tap **Select All** in the top-left corner.
   * Tap the **Share icon** (square with up-arrow) in the bottom-left and tap **Save [X] Images**.

🎉 **Bingo!** All your animated stickers are now stored inside your iPhone Photos camera roll, fully animated and ready to send anywhere!

---

## 🔒 Security & Performance Notice
- **Personal Use Only**: This utility is designed strictly for private backup and account management.
- **Signed URLs**: TikTok sticker URLs use short-lived cryptographic signatures. Always perform the scanning and downloading process in the same browser session to ensure that signatures do not expire.


## Discord : bajgos.nq
