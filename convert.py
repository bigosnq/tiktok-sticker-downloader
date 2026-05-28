import os
import sys
import subprocess

# --- Auto-install Pillow if missing ---
try:
    from PIL import Image, ImageSequence
except ImportError:
    print("Pillow library is required for conversion. Installing it now...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
        from PIL import Image, ImageSequence
        print("Pillow installed successfully!\n")
    except Exception as e:
        print(f"Error installing Pillow: {e}")
        print("Please run: pip install pillow")
        sys.exit(1)

def get_downloads_folder():
    """Gets the standard user Downloads folder in a robust, cross-platform way."""
    if os.name == 'nt':  # Windows
        import winreg
        sub_key = r'SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders'
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, sub_key) as key:
                return winreg.QueryValueEx(key, '{374DE290-123F-4565-9164-39C4925E467B}')[0]
        except Exception:
            return os.path.join(os.environ.get('USERPROFILE', ''), 'Downloads')
    else:  # macOS / Linux
        return os.path.join(os.path.expanduser('~'), 'Downloads')

def convert_webp_to_gif(src_path, dest_path):
    """Converts an animated WebP file to a true animated GIF."""
    try:
        im = Image.open(src_path)
        
        # Extract frames
        frames = []
        durations = []
        for frame in ImageSequence.Iterator(im):
            # Convert to RGBA then to Adaptive Palette for GIF compatibility
            frame_rgba = frame.convert("RGBA")
            # Create a clean palette image
            alpha = frame_rgba.split()[3]
            frame_rgb = frame_rgba.convert("RGB")
            # Convert to 'P' mode with transparency preserved
            frame_p = frame_rgb.convert("P", palette=Image.Palette.ADAPTIVE, colors=255)
            # Paste alpha mask
            mask = Image.eval(alpha, lambda a: 255 if a <= 128 else 0)
            frame_p.paste(255, mask)
            
            frames.append(frame_p)
            # Use frame duration if available, default to 100ms
            durations.append(frame.info.get('duration', 100))
            
        if not frames:
            return False

        # Save frames as an animated GIF
        frames[0].save(
            dest_path,
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=0,
            transparency=255,
            disposal=2 # Restore to background (prevents frames stacking)
        )
        return True
    except Exception as e:
        print(f"Failed to convert {os.path.basename(src_path)}: {e}")
        return False

def main():
    import shutil

    # 1. Determine local script path (so it works inside the project folder)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    local_src = os.path.join(script_dir, 'tiktok-stickers')
    local_dest = os.path.join(script_dir, 'tiktok-stickers-gifs')

    # 2. Check system downloads path
    downloads = get_downloads_folder()
    system_src = os.path.join(downloads, 'tiktok-stickers')

    # 3. Automatically import from Downloads if found there but not locally
    if os.path.exists(system_src) and not os.path.exists(local_src):
        print(f"Found downloaded stickers in system Downloads: {system_src}")
        print("Automatically importing them into your project folder...")
        try:
            shutil.copytree(system_src, local_src)
            print("Import complete! ✓\n")
        except Exception as e:
            print(f"Warning: Could not automatically copy folder: {e}")

    # 4. Use project folder as source if it exists
    if os.path.exists(local_src):
        src_dir = local_src
        dest_dir = local_dest
        print("Using local project folder 'tiktok-stickers' for conversion.")
    else:
        # Fallback directly to system Downloads if local copy is missing
        src_dir = system_src
        dest_dir = os.path.join(downloads, 'tiktok-stickers-gifs')
        print("Project folder 'tiktok-stickers' not found locally.")
        print(f"Falling back to system Downloads folder: {src_dir}")

    if not os.path.exists(src_dir):
        print(f"\nError: Could not find the stickers folder at:\n{src_dir}")
        print("\nPlease make sure you have scanned and downloaded stickers using the extension first.")
        input("\nPress Enter to exit...")
        return

    os.makedirs(dest_dir, exist_ok=True)
    
    # Scan for downloaded files (.webp)
    files = [f for f in os.listdir(src_dir) if f.lower().endswith('.webp')]
    
    if not files:
        print(f"No .webp sticker files found in:\n{src_dir}")
        input("\nPress Enter to exit...")
        return

    print(f"Found {len(files)} sticker(s) to convert...")
    print(f"Converting and saving to:\n{dest_dir}\n")

    converted = 0
    for idx, filename in enumerate(files):
        src_path = os.path.join(src_dir, filename)
        # Rename .webp to .gif
        gif_filename = os.path.splitext(filename)[0] + '.gif'
        dest_path = os.path.join(dest_dir, gif_filename)

        print(f"[{idx+1}/{len(files)}] Converting {filename}...", end="\r")
        if convert_webp_to_gif(src_path, dest_path):
            converted += 1

    print(f"\n\nSuccess! Successfully converted {converted}/{len(files)} stickers to true animated GIFs!")
    print(f"They are saved in: {dest_dir}")
    print("\nNext steps:")
    print("1. Compress the new 'tiktok-stickers-gifs' folder into a ZIP file.")
    print("2. Send the ZIP to your iPhone and save them — they will now be fully animated in your iOS Photos app!")
    
    input("\nPress Enter to close this window...")

if __name__ == '__main__':
    main()
