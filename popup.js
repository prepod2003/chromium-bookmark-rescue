const HOST_NAME = "com.chromium_bookmark_rescue.host";

const BROWSER_META = {
  comet:    { name: "Comet",    icon: "\u{1F320}" },
  arc:      { name: "Arc",      icon: "\u{1F308}" },
  brave:    { name: "Brave",    icon: "\u{1F981}" },
  vivaldi:  { name: "Vivaldi",  icon: "\u{1F3B6}" },
  opera:    { name: "Opera",    icon: "\u{1F3AC}" },
  "opera-gx": { name: "Opera GX", icon: "\u{1F3AE}" },
  edge:     { name: "Edge",     icon: "\u{1F310}" },
  yandex:   { name: "Yandex",   icon: "\u{1F534}" },
  chrome:   { name: "Chrome",   icon: "\u{1F536}" },
  chromium: { name: "Chromium", icon: "\u{1F535}" },
};

let selectedBookmarks = null;
let selectedBrowserName = "";
let nativeAvailable = false;

// --- State management ---

function showState(id) {
  document.querySelectorAll(".state").forEach((el) => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function showStatus(msg, type) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = type;
  el.style.display = "block";
}

function hideStatus() {
  document.getElementById("status").style.display = "none";
}

// --- Native Messaging ---

function sendNativeMessage(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(HOST_NAME, msg, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

async function detectBrowsers() {
  try {
    const response = await sendNativeMessage({ action: "detect" });
    nativeAvailable = true;
    return response.browsers || [];
  } catch {
    nativeAvailable = false;
    return null;
  }
}

async function readBrowserBookmarks(browserId) {
  const response = await sendNativeMessage({ action: "read", browser: browserId });
  if (response.error) throw new Error(response.error);
  return response;
}

// --- UI rendering ---

function renderBrowserList(browsers) {
  const list = document.getElementById("browserList");
  list.innerHTML = "";

  if (!browsers || browsers.length === 0) {
    list.innerHTML = '<div class="no-browsers">Браузеры с закладками не найдены</div>';
    return;
  }

  // Don't show Chrome as source (you're importing INTO Chrome)
  const filtered = browsers.filter((b) => b.id !== "chrome");

  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-browsers">Нет других браузеров с закладками</div>';
    return;
  }

  for (const browser of filtered) {
    const meta = BROWSER_META[browser.id] || { name: browser.id, icon: "\u{1F4E6}" };
    const item = document.createElement("div");
    item.className = "browser-item";
    item.innerHTML = `
      <span class="icon">${meta.icon}</span>
      <div class="info">
        <div class="name">${meta.name}</div>
        <div class="meta">${browser.urls} закладок, ${browser.folders} папок</div>
      </div>
      <span class="arrow">\u203A</span>
    `;
    item.addEventListener("click", () => onBrowserClick(browser.id, meta.name));
    list.appendChild(item);
  }
}

async function onBrowserClick(browserId, browserName) {
  hideStatus();
  showState("stateLoading");
  document.querySelector("#stateLoading .loading").textContent = `Читаю закладки ${browserName}...`;

  try {
    const data = await readBrowserBookmarks(browserId);
    selectedBookmarks = data.bookmarks;
    selectedBrowserName = browserName;
    showConfirm(browserName, data.urls, data.folders);
  } catch (err) {
    showState("stateBrowsers");
    showStatus("Ошибка: " + err.message, "error");
  }
}

function showConfirm(name, urls, folders) {
  document.getElementById("confirmName").textContent = name;
  document.getElementById("confirmStats").innerHTML =
    `<span class="num">${urls}</span> закладок, <span class="num">${folders}</span> папок`;
  showState("stateConfirm");
}

// --- File fallback ---

function setupFileArea(areaId, inputId) {
  const area = document.getElementById(areaId);
  const input = document.getElementById(inputId);

  area.addEventListener("click", () => input.click());
  area.addEventListener("dragover", (e) => {
    e.preventDefault();
    area.classList.add("dragover");
  });
  area.addEventListener("dragleave", () => area.classList.remove("dragover"));
  area.addEventListener("drop", (e) => {
    e.preventDefault();
    area.classList.remove("dragover");
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0], area);
  });
  input.addEventListener("change", () => {
    if (input.files.length) handleFile(input.files[0], area);
  });
}

function handleFile(file, area) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.roots || !data.roots.bookmark_bar) {
        throw new Error("Неверный формат файла");
      }
      selectedBookmarks = data.roots.bookmark_bar.children || [];
      selectedBrowserName = file.name;

      const urls = countBookmarks(selectedBookmarks);
      const folders = countFolders(selectedBookmarks);

      area.classList.add("has-file");
      area.querySelector("input").style.display = "none";
      area.textContent = `\u2705 ${file.name}`;

      showConfirm(file.name, urls, folders);
    } catch (err) {
      showStatus("Ошибка: " + err.message, "error");
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

async function doReplace() {
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
    const count = await createBookmarks(selectedBookmarks, roots[0].id);

    showStatus(`Готово! Создано ${count} элементов. Закладки синхронизируются автоматически.`, "success");
  } catch (err) {
    showStatus("Ошибка: " + err.message, "error");
  }

  confirmBtn.disabled = false;
  cancelBtn.disabled = false;
}

// --- Init ---

document.getElementById("cancelBtn").addEventListener("click", () => {
  hideStatus();
  showState(nativeAvailable ? "stateBrowsers" : "stateSetup");
});

document.getElementById("confirmBtn").addEventListener("click", doReplace);

setupFileArea("fileAreaFallback", "fileInputFallback");
setupFileArea("fileAreaMain", "fileInputMain");

(async () => {
  const browsers = await detectBrowsers();
  if (browsers === null) {
    showState("stateSetup");
  } else {
    renderBrowserList(browsers);
    showState("stateBrowsers");
  }
})();
