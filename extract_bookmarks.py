"""
Extract the Bookmarks file from a Chromium-based browser.

Automatically detects installed browsers and copies the Bookmarks file
so you can load it in the Chromium Bookmark Rescue extension.

Supports Windows, macOS, and Linux.

Usage:
    python extract_bookmarks.py
    python extract_bookmarks.py --browser comet
    python extract_bookmarks.py --output my_bookmarks.json
"""
import argparse
import json
import os
import platform
import shutil
import sys


def get_browser_paths():
    """Return browser name -> User Data path mapping for the current OS."""
    system = platform.system()

    if system == "Windows":
        local = os.environ.get("LOCALAPPDATA", "")
        roaming = os.environ.get("APPDATA", "")
        return {
            "comet": os.path.join(local, "Perplexity", "Comet", "User Data"),
            "arc": os.path.join(local, "Arc", "User Data"),
            "brave": os.path.join(local, "BraveSoftware", "Brave-Browser", "User Data"),
            "vivaldi": os.path.join(local, "Vivaldi", "User Data"),
            "opera": os.path.join(roaming, "Opera Software", "Opera Stable"),
            "opera-gx": os.path.join(roaming, "Opera Software", "Opera GX Stable"),
            "edge": os.path.join(local, "Microsoft", "Edge", "User Data"),
            "yandex": os.path.join(local, "Yandex", "YandexBrowser", "User Data"),
            "chrome": os.path.join(local, "Google", "Chrome", "User Data"),
            "chromium": os.path.join(local, "Chromium", "User Data"),
        }

    elif system == "Darwin":  # macOS
        support = os.path.expanduser("~/Library/Application Support")
        return {
            "comet": os.path.join(support, "Perplexity", "Comet"),
            "arc": os.path.join(support, "Arc", "User Data"),
            "brave": os.path.join(support, "BraveSoftware", "Brave-Browser"),
            "vivaldi": os.path.join(support, "Vivaldi"),
            "opera": os.path.join(support, "com.operasoftware.Opera"),
            "edge": os.path.join(support, "Microsoft Edge"),
            "chrome": os.path.join(support, "Google", "Chrome"),
            "chromium": os.path.join(support, "Chromium"),
        }

    else:  # Linux
        config = os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config"))
        return {
            "brave": os.path.join(config, "BraveSoftware", "Brave-Browser"),
            "vivaldi": os.path.join(config, "vivaldi"),
            "opera": os.path.join(config, "opera"),
            "edge": os.path.join(config, "microsoft-edge"),
            "chrome": os.path.join(config, "google-chrome"),
            "chromium": os.path.join(config, "chromium"),
        }


def find_bookmarks(user_data_path):
    """Find Bookmarks file in a browser's User Data directory."""
    profiles = ["Default"] + [f"Profile {i}" for i in range(1, 10)]
    for profile in profiles:
        path = os.path.join(user_data_path, profile, "Bookmarks")
        if os.path.isfile(path):
            return path
    # Some browsers (Opera) keep Bookmarks directly in the folder
    path = os.path.join(user_data_path, "Bookmarks")
    if os.path.isfile(path):
        return path
    return None


def validate_bookmarks(path):
    """Validate that the file is a Chromium bookmarks file."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "roots" not in data or "bookmark_bar" not in data["roots"]:
        raise ValueError("Not a valid Chromium bookmarks file")
    return data


def count_items(node):
    """Count URLs and folders recursively."""
    urls, folders = 0, 0
    for child in node.get("children", []):
        if child.get("type") == "folder":
            folders += 1
            u, f = count_items(child)
            urls += u
            folders += f
        else:
            urls += 1
    return urls, folders


def main():
    parser = argparse.ArgumentParser(
        description="Extract bookmarks from a Chromium-based browser"
    )
    browsers = get_browser_paths()
    parser.add_argument(
        "--browser", "-b",
        choices=list(browsers.keys()),
        help="Browser to extract from (auto-detected if omitted)",
    )
    parser.add_argument(
        "--output", "-o",
        default="Bookmarks",
        help="Output file name (default: Bookmarks)",
    )
    args = parser.parse_args()

    if args.browser:
        search = {args.browser: browsers[args.browser]}
    else:
        search = browsers

    found = []
    for name, path in search.items():
        bookmarks_path = find_bookmarks(path)
        if bookmarks_path:
            try:
                data = validate_bookmarks(bookmarks_path)
                bar = data["roots"]["bookmark_bar"]
                urls, folders = count_items(bar)
                found.append((name, bookmarks_path, urls, folders))
            except (json.JSONDecodeError, ValueError):
                continue

    if not found:
        print("No Chromium browser bookmarks found on this system.")
        sys.exit(1)

    print(f"Found {len(found)} browser(s) with bookmarks:\n")
    for i, (name, path, urls, folders) in enumerate(found):
        print(f"  [{i + 1}] {name.capitalize():12s} {urls:>5} bookmarks, {folders:>4} folders")
        print(f"      {path}")
        print()

    if len(found) == 1:
        choice = 0
    else:
        try:
            raw = input("Select browser [number]: ").strip()
            choice = int(raw) - 1
            if choice < 0 or choice >= len(found):
                print("Invalid choice.")
                sys.exit(1)
        except (ValueError, EOFError):
            sys.exit(1)

    name, path, urls, folders = found[choice]
    shutil.copy2(path, args.output)
    output_abs = os.path.abspath(args.output)
    print(f"\nCopied {urls} bookmarks ({folders} folders) from {name.capitalize()}")
    print(f"Saved to: {output_abs}")
    print()
    print("Next step: load this file in the Chromium Bookmark Rescue extension.")


if __name__ == "__main__":
    main()
