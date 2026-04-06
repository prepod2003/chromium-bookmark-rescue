"""
Native Messaging host for Chromium Bookmark Rescue extension.

Communicates with the Chrome extension via stdin/stdout using
Chrome's Native Messaging protocol (length-prefixed JSON).
"""
import json
import os
import platform
import struct
import sys


def get_browser_paths():
    """Return browser name -> User Data path mapping."""
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
    elif system == "Darwin":
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
    else:
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
    """Find Bookmarks file in browser's profile directory."""
    profiles = ["Default"] + [f"Profile {i}" for i in range(1, 10)]
    for profile in profiles:
        path = os.path.join(user_data_path, profile, "Bookmarks")
        if os.path.isfile(path):
            return path
    path = os.path.join(user_data_path, "Bookmarks")
    if os.path.isfile(path):
        return path
    return None


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


def read_message():
    """Read a Native Messaging message from stdin."""
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        sys.exit(0)
    length = struct.unpack("=I", raw_length)[0]
    data = sys.stdin.buffer.read(length).decode("utf-8")
    return json.loads(data)


def send_message(msg):
    """Send a Native Messaging message to stdout."""
    encoded = json.dumps(msg, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("=I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def handle_detect():
    """Detect all installed browsers with bookmarks."""
    browsers = get_browser_paths()
    found = []
    for name, path in browsers.items():
        bm_path = find_bookmarks(path)
        if bm_path:
            try:
                with open(bm_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                bar = data["roots"]["bookmark_bar"]
                urls, folders = count_items(bar)
                found.append({
                    "id": name,
                    "urls": urls,
                    "folders": folders,
                })
            except (json.JSONDecodeError, ValueError, KeyError):
                continue
    return {"action": "detect", "browsers": found}


def handle_read(browser_id):
    """Read bookmarks from a specific browser."""
    browsers = get_browser_paths()
    path = browsers.get(browser_id)
    if not path:
        return {"action": "read", "error": f"Unknown browser: {browser_id}"}

    bm_path = find_bookmarks(path)
    if not bm_path:
        return {"action": "read", "error": f"Bookmarks file not found for {browser_id}"}

    try:
        with open(bm_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        children = data["roots"]["bookmark_bar"].get("children", [])
        urls, folders = count_items(data["roots"]["bookmark_bar"])
        return {
            "action": "read",
            "browser": browser_id,
            "bookmarks": children,
            "urls": urls,
            "folders": folders,
        }
    except Exception as e:
        return {"action": "read", "error": str(e)}


def main():
    while True:
        msg = read_message()
        action = msg.get("action")

        if action == "detect":
            send_message(handle_detect())
        elif action == "read":
            send_message(handle_read(msg.get("browser", "")))
        elif action == "ping":
            send_message({"action": "pong"})
        else:
            send_message({"error": f"Unknown action: {action}"})


if __name__ == "__main__":
    main()
