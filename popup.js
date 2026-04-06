const statusEl = document.getElementById("status");
const statsEl = document.getElementById("stats");
const warningBox = document.getElementById("warningBox");
const replaceBtn = document.getElementById("replaceBtn");
const confirmBar = document.getElementById("confirmBar");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");
const fileInput = document.getElementById("fileInput");
const fileArea = document.getElementById("fileArea");
const fileLabel = document.getElementById("fileLabel");
const fileIcon = document.getElementById("fileIcon");
const copyToast = document.getElementById("copyToast");
const browserGrid = document.getElementById("browserGrid");

let bookmarksData = null;

// --- Status ---

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type;
  statusEl.style.display = "block";
}

function hideStatus() {
  statusEl.style.display = "none";
}

// --- Browser path copy ---

browserGrid.addEventListener("click", async (e) => {
  const btn = e.target.closest(".browser-btn");
  if (!btn) return;

  const path = btn.dataset.path;
  try {
    await navigator.clipboard.writeText(path);

    // Reset all buttons
    browserGrid.querySelectorAll(".browser-btn").forEach((b) => {
      b.classList.remove("copied");
    });
    btn.classList.add("copied");

    copyToast.textContent = "Путь скопирован! Вставьте в адресную строку Проводника (Ctrl+V)";
    setTimeout(() => {
      copyToast.textContent = "";
      btn.classList.remove("copied");
    }, 5000);
  } catch {
    copyToast.textContent = "Не удалось скопировать";
  }
});

// --- File handling ---

function parseBookmarksFile(text) {
  const data = JSON.parse(text);
  if (!data.roots || !data.roots.bookmark_bar) {
    throw new Error("Неверный формат файла. Убедитесь что это файл Bookmarks из Chromium-браузера.");
  }
  return data.roots.bookmark_bar.children || [];
}

function countBookmarks(items) {
  let count = 0;
  for (const item of items) {
    if (item.type === "folder") {
      count += countBookmarks(item.children || []);
    } else {
      count++;
    }
  }
  return count;
}

function countFolders(items) {
  let count = 0;
  for (const item of items) {
    if (item.type === "folder") {
      count += 1 + countFolders(item.children || []);
    }
  }
  return count;
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      bookmarksData = parseBookmarksFile(e.target.result);
      const urls = countBookmarks(bookmarksData);
      const folders = countFolders(bookmarksData);

      fileArea.classList.add("has-file");
      fileIcon.textContent = "\u2705";
      fileLabel.innerHTML = `<span class="filename">${file.name}</span>`;

      statsEl.innerHTML = `
        <span><span class="num">${urls}</span> закладок</span>
        <span><span class="num">${folders}</span> папок</span>
      `;
      statsEl.style.display = "flex";
      warningBox.style.display = "block";
      replaceBtn.disabled = false;
      hideStatus();
    } catch (err) {
      showStatus(err.message, "error");
      replaceBtn.disabled = true;
    }
  };
  reader.readAsText(file, "utf-8");
}

fileArea.addEventListener("click", () => fileInput.click());
fileArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  fileArea.classList.add("dragover");
});
fileArea.addEventListener("dragleave", () => {
  fileArea.classList.remove("dragover");
});
fileArea.addEventListener("drop", (e) => {
  e.preventDefault();
  fileArea.classList.remove("dragover");
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

// --- Replace with confirmation ---

replaceBtn.addEventListener("click", () => {
  if (!bookmarksData) return;
  replaceBtn.style.display = "none";
  confirmBar.classList.add("visible");
});

cancelBtn.addEventListener("click", () => {
  confirmBar.classList.remove("visible");
  replaceBtn.style.display = "";
});

confirmBtn.addEventListener("click", async () => {
  if (!bookmarksData) return;
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
  } catch (err) {
    showStatus("Ошибка: " + err.message, "error");
  }

  confirmBar.classList.remove("visible");
  replaceBtn.style.display = "";
  replaceBtn.disabled = false;
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
      const folder = await chrome.bookmarks.create({
        parentId,
        title: item.name || "",
      });
      count += 1 + await createBookmarks(item.children || [], folder.id);
    } else if (item.type === "url" && item.url) {
      await chrome.bookmarks.create({
        parentId,
        title: item.name || "",
        url: item.url,
      });
      count++;
    }
  }
  return count;
}
