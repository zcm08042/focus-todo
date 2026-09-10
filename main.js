const { app, BrowserWindow, ipcMain, dialog, Notification } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

const PRIORITIES = new Set(["high", "medium", "low"]);

function getDataFile() {
  return path.join(app.getPath("userData"), "todos.json");
}

function sanitizeTodo(raw, index) {
  if (!raw || typeof raw !== "object") return null;
  const text = typeof raw.text === "string" ? raw.text.trim().slice(0, 200) : "";
  if (!text) return null;
  const priority = PRIORITIES.has(raw.priority) ? raw.priority : "medium";
  const date =
    typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
      ? raw.date
      : null;
  return {
    id:
      typeof raw.id === "string" && raw.id
        ? raw.id
        : `${Date.now().toString(36)}-${index}`,
    text,
    priority,
    date,
    done: Boolean(raw.done),
    createdAt:
      typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    completedAt:
      typeof raw.completedAt === "string" ? raw.completedAt : null,
  };
}

function sanitizeTodos(list) {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeTodo).filter(Boolean);
}

function loadTodos() {
  try {
    return sanitizeTodos(
      JSON.parse(fs.readFileSync(getDataFile(), "utf8"))
    );
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  const clean = sanitizeTodos(todos);
  const file = getDataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(clean, null, 2), "utf8");
  return clean;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 720,
    minHeight: 540,
    title: "Focus Todo",
    backgroundColor: "#f6f5f2",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets", "icon.png"),
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
  notifyDueOnStart();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function notifyDueOnStart() {
  if (!Notification.isSupported()) return;
  const today = new Date().toISOString().slice(0, 10);
  const due = loadTodos().filter(
    (t) => !t.done && t.date && t.date <= today
  );
  if (!due.length) return;
  const overdue = due.filter((t) => t.date < today).length;
  const todayCount = due.length - overdue;
  const parts = [];
  if (overdue) parts.push(`${overdue} 条已过期`);
  if (todayCount) parts.push(`${todayCount} 条今天到期`);
  new Notification({
    title: "Focus Todo",
    body: parts.join("，") + "，打开应用查看。",
  }).show();
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("todos:load", () => loadTodos());

ipcMain.handle("todos:save", (_event, todos) => {
  try {
    return { ok: true, todos: saveTodos(todos) };
  } catch (err) {
    return { ok: false, error: err.message || "保存失败" };
  }
});

ipcMain.handle("app:export", async () => {
  try {
    const todos = loadTodos();
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "导出为 JSON",
      defaultPath: "focus-todo-backup.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    fs.writeFileSync(filePath, JSON.stringify(todos, null, 2), "utf8");
    return { ok: true, count: todos.length };
  } catch (err) {
    return { ok: false, error: err.message || "导出失败" };
  }
});

ipcMain.handle("app:import", async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "从 JSON 导入",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (canceled || !filePaths[0]) return { ok: false, canceled: true };
    const data = JSON.parse(fs.readFileSync(filePaths[0], "utf8"));
    if (!Array.isArray(data)) throw new Error("bad format");
    const todos = sanitizeTodos(data);
    saveTodos(todos);
    return { ok: true, todos };
  } catch {
    return { ok: false, error: "文件格式不正确" };
  }
});
