# Chromium Bookmark Rescue

[Русская версия](README.ru.md)

A Chrome extension that **fully replaces** your Chrome bookmarks with bookmarks from any Chromium-based browser — even those that don't offer a built-in export.

Works with **Comet** (Perplexity), **Arc**, **Brave**, **Vivaldi**, **Opera**, **Edge**, **Yandex Browser**, and any other Chromium-based browser.

## Why?

Some Chromium-based browsers (like [Comet by Perplexity](https://comet.perplexity.ai/)) provide no way to export bookmarks. You can't just copy the `Bookmarks` file either, because:

- Chrome's built-in **"Import bookmarks"** dumps everything into a separate folder (e.g., *"Imported"*) instead of replacing the existing bookmarks.
- If **Google Sync** is enabled, manually replacing the file gets overwritten by cloud data on the next launch.

This extension solves both problems by using Chrome's official `chrome.bookmarks` API. Chrome treats API changes as normal user actions and syncs them correctly.

## Quick Start

### 1. Locate the Bookmarks file

Find the `Bookmarks` file in the source browser's profile directory.

<details>
<summary><strong>Windows paths</strong></summary>

- **Comet** — `%LocalAppData%\Perplexity\Comet\User Data\Default\Bookmarks`
- **Arc** — `%LocalAppData%\Arc\User Data\Default\Bookmarks`
- **Brave** — `%LocalAppData%\BraveSoftware\Brave-Browser\User Data\Default\Bookmarks`
- **Vivaldi** — `%LocalAppData%\Vivaldi\User Data\Default\Bookmarks`
- **Opera** — `%AppData%\Opera Software\Opera Stable\Bookmarks`
- **Opera GX** — `%AppData%\Opera Software\Opera GX Stable\Bookmarks`
- **Edge** — `%LocalAppData%\Microsoft\Edge\User Data\Default\Bookmarks`
- **Yandex** — `%LocalAppData%\Yandex\YandexBrowser\User Data\Default\Bookmarks`

</details>

<details>
<summary><strong>macOS paths</strong></summary>

- **Comet** — `~/Library/Application Support/Perplexity/Comet/Default/Bookmarks`
- **Arc** — `~/Library/Application Support/Arc/User Data/Default/Bookmarks`
- **Brave** — `~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Bookmarks`
- **Vivaldi** — `~/Library/Application Support/Vivaldi/Default/Bookmarks`
- **Opera** — `~/Library/Application Support/com.operasoftware.Opera/Bookmarks`
- **Edge** — `~/Library/Application Support/Microsoft Edge/Default/Bookmarks`
- **Chrome** — `~/Library/Application Support/Google/Chrome/Default/Bookmarks`

</details>

<details>
<summary><strong>Linux paths</strong></summary>

- **Brave** — `~/.config/BraveSoftware/Brave-Browser/Default/Bookmarks`
- **Vivaldi** — `~/.config/vivaldi/Default/Bookmarks`
- **Opera** — `~/.config/opera/Bookmarks`
- **Edge** — `~/.config/microsoft-edge/Default/Bookmarks`
- **Chrome** — `~/.config/google-chrome/Default/Bookmarks`
- **Chromium** — `~/.config/chromium/Default/Bookmarks`

</details>

Or use the included helper script to find it automatically:

```bash
python extract_bookmarks.py
```

The script detects all installed Chromium browsers and copies the `Bookmarks` file for you.

### 2. Install the extension

1. Download or clone this repository
2. Open **chrome://extensions/** in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **"Load unpacked"** and select this folder
5. Pin the extension icon in the toolbar for easy access

### 3. Replace bookmarks

1. Click the extension icon in the toolbar
2. Drag-and-drop the `Bookmarks` file (or click to browse)
3. Review the bookmark count
4. Click **"Replace all bookmarks"** and confirm

All existing Chrome bookmarks will be removed and replaced with the ones from the loaded file. If sync is enabled, the new bookmarks will be automatically uploaded to your Google account.

## How It Works

The extension uses the [`chrome.bookmarks`](https://developer.chrome.com/docs/extensions/reference/api/bookmarks) API to:

1. Remove all existing bookmarks from the Bookmark Bar and Other Bookmarks
2. Recreate the full folder structure and bookmarks from the source file

Because changes go through the official API (not file manipulation), Chrome treats them as regular user actions. Google Sync picks up the changes and propagates them to all your devices.

## Project Structure

```text
chromium-bookmark-rescue/
├── manifest.json             # Extension manifest (Manifest V3)
├── popup.html                # Extension popup UI
├── popup.js                  # Bookmark replacement logic
├── icon.svg                  # Extension icon
├── extract_bookmarks.py      # Helper: find & copy bookmarks
├── _locales/
│   ├── en/messages.json      # English strings
│   └── ru/messages.json      # Russian strings
├── LICENSE                   # MIT License
└── README.md
```

## FAQ

**Will this delete my passwords or other synced data?**
No. The extension only touches bookmarks. Passwords, history, extensions, and all other data remain untouched.

**Does it work with Google Sync enabled?**
Yes — that's the main reason this extension exists. Direct file replacement fails when sync is on, but API-based changes sync correctly.

**Can I undo the replacement?**
No. The replacement is permanent. If you need to revert, keep a copy of Chrome's original `Bookmarks` file before replacing (you can use `extract_bookmarks.py --browser chrome` to save it).

**Does it preserve the folder structure?**
Yes. The complete hierarchy of folders and bookmarks is recreated exactly as it was in the source browser.

**Which browsers are supported as a source?**
Any Chromium-based browser: Comet (Perplexity), Arc, Brave, Vivaldi, Opera, Opera GX, Microsoft Edge, Yandex Browser, Chromium, and others. If the browser stores bookmarks in the standard Chromium JSON format, it will work.

## Author

**Sergey Radzivillovich** — [prepod2003@yandex.ru](mailto:prepod2003@yandex.ru)

## License

[MIT](LICENSE)
