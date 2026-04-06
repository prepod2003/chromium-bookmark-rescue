"""
Setup script for Chromium Bookmark Rescue native messaging host.

Run once to register the native messaging host so the Chrome extension
can communicate with the local Python script to find bookmarks.

Usage:
    python setup.py
    python setup.py --uninstall
"""
import json
import os
import platform
import sys
import argparse

HOST_NAME = "com.chromium_bookmark_rescue.host"
EXTENSION_ID_PLACEHOLDER = "EXTENSION_ID_HERE"


def get_host_script_path():
    """Get absolute path to the host script."""
    return os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "host",
        "bookmark_rescue_host.py",
    )


def get_manifest_content(extension_id=None):
    """Generate native messaging host manifest."""
    host_script = get_host_script_path()
    system = platform.system()

    if system == "Windows":
        # On Windows, we need a batch wrapper
        bat_path = os.path.join(os.path.dirname(host_script), "bookmark_rescue_host.bat")
        manifest = {
            "name": HOST_NAME,
            "description": "Chromium Bookmark Rescue - finds bookmarks from other browsers",
            "path": bat_path,
            "type": "stdio",
        }
    else:
        manifest = {
            "name": HOST_NAME,
            "description": "Chromium Bookmark Rescue - finds bookmarks from other browsers",
            "path": host_script,
            "type": "stdio",
        }

    if extension_id:
        manifest["allowed_origins"] = [f"chrome-extension://{extension_id}/"]
    else:
        # Allow all extensions during development
        manifest["allowed_origins"] = ["chrome-extension://*/"]

    return manifest


def create_bat_wrapper():
    """Create a .bat wrapper for Windows."""
    host_script = get_host_script_path()
    bat_path = os.path.join(os.path.dirname(host_script), "bookmark_rescue_host.bat")

    # Find python executable
    python_path = sys.executable

    with open(bat_path, "w") as f:
        f.write(f'@echo off\n"{python_path}" "{host_script}" %*\n')

    return bat_path


def install_windows(extension_id=None):
    """Install native messaging host on Windows."""
    import winreg

    create_bat_wrapper()

    manifest = get_manifest_content(extension_id)
    manifest_dir = os.path.join(os.path.dirname(get_host_script_path()))
    manifest_path = os.path.join(manifest_dir, f"{HOST_NAME}.json")

    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    # Register in Windows Registry
    key_path = f"SOFTWARE\\Google\\Chrome\\NativeMessagingHosts\\{HOST_NAME}"
    try:
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path)
        winreg.SetValueEx(key, "", 0, winreg.REG_SZ, manifest_path)
        winreg.CloseKey(key)
    except Exception as e:
        print(f"Error writing to registry: {e}")
        return False

    return manifest_path


def install_macos(extension_id=None):
    """Install native messaging host on macOS."""
    manifest = get_manifest_content(extension_id)

    # Make host script executable
    os.chmod(get_host_script_path(), 0o755)

    target_dir = os.path.expanduser(
        "~/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    )
    os.makedirs(target_dir, exist_ok=True)

    manifest_path = os.path.join(target_dir, f"{HOST_NAME}.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    return manifest_path


def install_linux(extension_id=None):
    """Install native messaging host on Linux."""
    manifest = get_manifest_content(extension_id)

    # Make host script executable
    os.chmod(get_host_script_path(), 0o755)

    target_dir = os.path.expanduser("~/.config/google-chrome/NativeMessagingHosts")
    os.makedirs(target_dir, exist_ok=True)

    manifest_path = os.path.join(target_dir, f"{HOST_NAME}.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    return manifest_path


def uninstall():
    """Remove native messaging host registration."""
    system = platform.system()

    if system == "Windows":
        import winreg
        key_path = f"SOFTWARE\\Google\\Chrome\\NativeMessagingHosts\\{HOST_NAME}"
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, key_path)
            print("Registry key removed.")
        except FileNotFoundError:
            print("Registry key not found (already uninstalled).")
    elif system == "Darwin":
        path = os.path.expanduser(
            f"~/Library/Application Support/Google/Chrome/NativeMessagingHosts/{HOST_NAME}.json"
        )
        if os.path.exists(path):
            os.remove(path)
            print(f"Removed: {path}")
    else:
        path = os.path.expanduser(
            f"~/.config/google-chrome/NativeMessagingHosts/{HOST_NAME}.json"
        )
        if os.path.exists(path):
            os.remove(path)
            print(f"Removed: {path}")

    # Remove bat wrapper on Windows
    bat_path = os.path.join(
        os.path.dirname(get_host_script_path()), "bookmark_rescue_host.bat"
    )
    if os.path.exists(bat_path):
        os.remove(bat_path)

    # Remove manifest from host dir
    manifest_path = os.path.join(
        os.path.dirname(get_host_script_path()), f"{HOST_NAME}.json"
    )
    if os.path.exists(manifest_path):
        os.remove(manifest_path)

    print("Uninstall complete.")


def main():
    parser = argparse.ArgumentParser(description="Setup Chromium Bookmark Rescue")
    parser.add_argument("--uninstall", action="store_true", help="Remove installation")
    parser.add_argument("--extension-id", help="Chrome extension ID (optional)")
    args = parser.parse_args()

    if args.uninstall:
        uninstall()
        return

    system = platform.system()
    print(f"Installing native messaging host for {system}...")

    if system == "Windows":
        result = install_windows(args.extension_id)
    elif system == "Darwin":
        result = install_macos(args.extension_id)
    else:
        result = install_linux(args.extension_id)

    if result:
        print(f"\nInstalled successfully!")
        print(f"Manifest: {result}")
        print(f"\nNow reload the extension in chrome://extensions/ and it will")
        print(f"automatically detect browsers with bookmarks.")
    else:
        print("\nInstallation failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
