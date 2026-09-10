const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function getDataFile() {
  return path.join(app.getPath("userData"), "todos.json");
}

function loadTodos() {
  try {
    const file = getDataFile();
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  const file = getDataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(todos, null, 2), "utf8");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 920,
    height: 640,
    minWidth: 720,
    minHeight: 520,
    title: "Focus Todo",
    backgroundColor: "#f6f5f2",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("todos:load", () => loadTodos());

ipcMain.handle("todos:save", (_event, todos) => {
  saveTodos(todos);
  return true;
});

ipcMain.handle("app:export", async () => {
  const todos = loadTodos();
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "导出为 JSON",
    defaultPath: "focus-todo-backup.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  fs.writeFileSync(filePath, JSON.stringify(todos, null, 2), "utf8");
  return { ok: true };
});

ipcMain.handle("app:import", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "从 JSON 导入",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"],
  });
  if (canceled || !filePaths[0]) return { ok: false, canceled: true };
  try {
    const data = JSON.parse(fs.readFileSync(filePaths[0], "utf8"));
    if (!Array.isArray(data)) throw new Error("bad format");
    saveTodos(data);
    return { ok: true, todos: data };
  } catch {
    return { ok: false, error: "文件格式不正确" };
  }
});
