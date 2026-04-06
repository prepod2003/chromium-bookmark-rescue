const BROWSERS = [
  { id: "comet",    name: "Comet",    icon: "\u{1F320}", path: "%LOCALAPPDATA%\\Perplexity\\Comet\\User Data\\Default" },
  { id: "arc",      name: "Arc",      icon: "\u{1F308}", path: "%LOCALAPPDATA%\\Arc\\User Data\\Default" },
  { id: "brave",    name: "Brave",    icon: "\u{1F981}", path: "%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\User Data\\Default" },
  { id: "vivaldi",  name: "Vivaldi",  icon: "\u{1F3B6}", path: "%LOCALAPPDATA%\\Vivaldi\\User Data\\Default" },
  { id: "opera",    name: "Opera",    icon: "\u{1F3AC}", path: "%APPDATA%\\Opera Software\\Opera Stable" },
  { id: "opera-gx", name: "Opera GX", icon: "\u{1F3AE}", path: "%APPDATA%\\Opera Software\\Opera GX Stable" },
  { id: "edge",     name: "Edge",     icon: "\u{1F310}", path: "%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default" },
  { id: "yandex",   name: "Yandex",   icon: "\u{1F534}", path: "%LOCALAPPDATA%\\Yandex\\YandexBrowser\\User Data\\Default" },
];

let bookmarksData = null;

// --- Init browser grid ---

const grid = document.getElementById("browserGrid");
for (const browser of BROWSERS) {
  const btn = document.createElement("button");
  btn.className = "browser-btn";
  btn.innerHTML = `<span class="icon">${browser.icon}</span><span class="name">${browser.name}</span>`;
  btn.addEventListener("click", () => onBrowserClick(browser));
  grid.appendChild(btn);
}

// --- Browser click: show path + open file picker ---

function onBrowserClick(browser) {
  // Show path hint
  const hint = document.getElementById("pathHint");
  const pathText = document.getElementById("pathText");
  pathText.textContent = browser.path;
  hint.classList.add("visible");

  // Copy path to clipboard
  navigator.clipboard.writeText(browser.path).catch(() => {});

  // Open file picker
  document.getElementById("fileInput").click();
}

// --- File handling ---

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.roots || !data.roots.bookmark_bar) {
        throw new Error("Неверный формат. Убедитесь что это файл Bookmarks из Chromium-браузера.");
      }
      bookmarksData = data.roots.bookmark_bar.children || [];

      const urls = countBookmarks(bookmarksData);
      const folders = countFolders(bookmarksData);

      // Update UI
      const fileArea = document.getElementById("fileArea");
      fileArea.classList.add("has-file");
      fileArea.textContent = "\u2705 " + file.name;

      const stats = document.getElementById("stats");
      stats.innerHTML = `
        <span><span class="num">${urls}</span> закладок</span>
        <span><span class="num">${folders}</span> папок</span>
      `;
      stats.style.display = "flex";

      document.getElementById("warningBox").style.display = "block";
      document.getElementById("replaceBtn").style.display = "block";
      document.getElementById("pathHint").classList.remove("visible");
      hideStatus();
    } catch (err) {
      showStatus(err.message, "error");
    }
  };
  reader.readAsText(file, "utf-8");
}

function countBookmarks(items) {
  let c = 0;
  for (const i of items) c += i.type === "folder" ? countBookmarks(i.children || []) : 1;
  return c;
}

function countFolders(items) {
  let c = 0;
  for (const i of items) if (i.type === "folder") c += 1 + countFolders(i.children || []);
  return c;
}

// --- File area events ---

const fileArea = document.getElementById("fileArea");
const fileInput = document.getElementById("fileInput");

fileArea.addEventListener("click", () => fileInput.click());
fileArea.addEventListener("dragover", (e) => { e.preventDefault(); fileArea.classList.add("dragover"); });
fileArea.addEventListener("dragleave", () => fileArea.classList.remove("dragover"));
fileArea.addEventListener("drop", (e) => {
  e.preventDefault();
  fileArea.classList.remove("dragover");
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

// --- Replace with confirmation ---

document.getElementById("replaceBtn").addEventListener("click", () => {
  document.getElementById("replaceBtn").style.display = "none";
  document.getElementById("confirmBar").classList.add("visible");
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  document.getElementById("confirmBar").classList.remove("visible");
  document.getElementById("replaceBtn").style.display = "block";
});

document.getElementById("confirmBtn").addEventListener("click", async () => {
  if (!bookmarksData) return;
  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  confirmBtn.disabled = true;
  cancelBtn.disabled = true;

  try {
    const tree = await chrome.bookmarks.getTree();
    const roots = tree[0].children;

    showStatus("Удаляю старые закладки...", "info");
    await removeAllChildren(roots[0].id);
    if (roots[1]) await removeAllChildren(roots[1].id);

    showStatus("Создаю новые закладки...", "info");
    const count = await createBookmarks(bookmarksData, roots[0].id);

    showStatus(`Готово! Создано ${count} элементов. Закладки синхронизируются автоматически.`, "success");
    document.getElementById("confirmBar").classList.remove("visible");
  } catch (err) {
    showStatus("Ошибка: " + err.message, "error");
  }

  confirmBtn.disabled = false;
  cancelBtn.disabled = false;
});

// --- Bookmark operations ---

async function removeAllChildren(parentId) {
  const children = await chrome.bookmarks.getChildren(parentId);
  for (const child of children) {
    if (child.url === undefined) {
      await chrome.bookmarks.removeTree(child.id);
    } else {
      await chrome.bookmarks.remove(child.id);
    }
  }
}

async function createBookmarks(items, parentId) {
  let count = 0;
  for (const item of items) {
    if (item.type === "folder") {
      const folder = await chrome.bookmarks.create({ parentId, title: item.name || "" });
      count += 1 + await createBookmarks(item.children || [], folder.id);
    } else if (item.type === "url" && item.url) {
      await chrome.bookmarks.create({ parentId, title: item.name || "", url: item.url });
      count++;
    }
  }
  return count;
}

// --- Status ---

function showStatus(msg, type) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = type;
  el.style.display = "block";
}

function hideStatus() {
  document.getElementById("status").style.display = "none";
}
