const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  loadTodos: () => ipcRenderer.invoke("todos:load"),
  saveTodos: (todos) => ipcRenderer.invoke("todos:save", todos),
  exportTodos: () => ipcRenderer.invoke("app:export"),
  importTodos: () => ipcRenderer.invoke("app:import"),
});
