const state = {
  todos: [],
  view: "today",
  settings: {
    theme: "light",
    defaultView: "today",
    defaultPriority: "medium",
  },
  editingId: null,
  confirmAction: null,
};

const el = {
  nav: document.getElementById("nav"),
  viewTitle: document.getElementById("viewTitle"),
  dateLine: document.getElementById("dateLine"),
  input: document.getElementById("input"),
  priority: document.getElementById("priority"),
  date: document.getElementById("date"),
  addBtn: document.getElementById("addBtn"),
  hint: document.getElementById("hint"),
  list: document.getElementById("list"),
  empty: document.getElementById("empty"),
  emptyTitle: document.getElementById("emptyTitle"),
  emptyDesc: document.getElementById("emptyDesc"),
  listView: document.getElementById("listView"),
  settingsView: document.getElementById("settingsView"),
  composer: document.getElementById("composer"),
  statLabel: document.getElementById("statLabel"),
  statValue: document.getElementById("statValue"),
  themeBtn: document.getElementById("themeBtn"),
  themeSelect: document.getElementById("themeSelect"),
  defaultView: document.getElementById("defaultView"),
  defaultPriority: document.getElementById("defaultPriority"),
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  clearDoneBtn: document.getElementById("clearDoneBtn"),
  editDialog: document.getElementById("editDialog"),
  editForm: document.getElementById("editForm"),
  editText: document.getElementById("editText"),
  editPriority: document.getElementById("editPriority"),
  editDate: document.getElementById("editDate"),
  editCancel: document.getElementById("editCancel"),
  confirmDialog: document.getElementById("confirmDialog"),
  confirmTitle: document.getElementById("confirmTitle"),
  confirmBody: document.getElementById("confirmBody"),
  confirmOk: document.getElementById("confirmOk"),
  confirmCancel: document.getElementById("confirmCancel"),
  toast: document.getElementById("toast"),
};

const viewMeta = {
  today: {
    title: "今日",
    emptyTitle: "今天还没有待办",
    emptyDesc: "从上面添加一项开始吧",
  },
  all: {
    title: "全部",
    emptyTitle: "还没有待办",
    emptyDesc: "先记下一件要做的事",
  },
  done: {
    title: "已完成",
    emptyTitle: "还没有完成的任务",
    emptyDesc: "完成后会出现在这里",
  },
  settings: {
    title: "设置",
  },
};

const priorityLabel = { high: "高", medium: "中", low: "低" };

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDateLine() {
  const d = new Date();
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 · 星期${week}`;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.toast.hidden = true;
  }, 1600);
}

function setHint(message) {
  el.hint.textContent = message || "";
}

function applyTheme(theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = resolved;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem("focus-todo-settings");
    if (raw) state.settings = { ...state.settings, ...JSON.parse(raw) };
  } catch {}
  el.themeSelect.value = state.settings.theme;
  el.defaultView.value = state.settings.defaultView;
  el.defaultPriority.value = state.settings.defaultPriority;
  el.priority.value = state.settings.defaultPriority;
  applyTheme(state.settings.theme);
}

function saveSettings() {
  localStorage.setItem("focus-todo-settings", JSON.stringify(state.settings));
  applyTheme(state.settings.theme);
}

async function persist() {
  await window.api.saveTodos(state.todos);
}

function visibleTodos() {
  const today = todayISO();
  if (state.view === "today") {
    return state.todos.filter((t) => !t.done && t.date === today);
  }
  if (state.view === "done") {
    return state.todos.filter((t) => t.done);
  }
  if (state.view === "all") {
    return state.todos.filter((t) => !t.done);
  }
  return [];
}

function updateStats() {
  const today = todayISO();
  if (state.view === "settings") {
    el.statLabel.textContent = "本地存储";
    el.statValue.textContent = `${state.todos.length} 条`;
    return;
  }
  const todayAll = state.todos.filter((t) => t.date === today);
  const done = todayAll.filter((t) => t.done).length;
  el.statLabel.textContent = "今日完成";
  el.statValue.textContent = `${done} / ${todayAll.length}`;
}

function renderList() {
  const todos = visibleTodos();
  el.list.innerHTML = "";

  if (!todos.length) {
    el.empty.hidden = false;
    el.emptyTitle.textContent = viewMeta[state.view].emptyTitle;
    el.emptyDesc.textContent = viewMeta[state.view].emptyDesc;
    return;
  }

  el.empty.hidden = true;
  const today = todayISO();

  for (const todo of todos) {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.done ? " done" : "");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "check";
    check.checked = todo.done;
    check.addEventListener("change", async () => {
      todo.done = check.checked;
      todo.updatedAt = new Date().toISOString();
      await persist();
      render();
    });

    const body = document.createElement("div");
    body.className = "todo-body";

    const text = document.createElement("div");
    text.className = "todo-text";
    text.textContent = todo.text;

    const meta = document.createElement("div");
    meta.className = "todo-meta";

    const pChip = document.createElement("span");
    pChip.className = `chip ${todo.priority}`;
    pChip.textContent = priorityLabel[todo.priority] || "中";
    meta.appendChild(pChip);

    if (todo.date) {
      const dChip = document.createElement("span");
      const overdue = !todo.done && todo.date < today;
      dChip.className = "chip" + (overdue ? " overdue" : "");
      dChip.textContent = overdue
        ? "已过期"
        : todo.date === today
          ? "今天"
          : todo.date;
      meta.appendChild(dChip);
    }

    body.appendChild(text);
    body.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.title = "编辑";
    editBtn.textContent = "编辑";
    editBtn.addEventListener("click", () => openEdit(todo));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.title = "删除";
    delBtn.textContent = "删除";
    delBtn.addEventListener("click", () =>
      openConfirm({
        title: "删除待办？",
        body: "删除后无法恢复。",
        okText: "删除",
        onOk: async () => {
          state.todos = state.todos.filter((t) => t.id !== todo.id);
          await persist();
          render();
          showToast("已删除");
        },
      })
    );

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(check);
    li.appendChild(body);
    li.appendChild(actions);
    el.list.appendChild(li);
  }
}

function render() {
  el.dateLine.textContent = formatDateLine();
  el.viewTitle.textContent = viewMeta[state.view].title;

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === state.view);
  });

  const isSettings = state.view === "settings";
  el.settingsView.hidden = !isSettings;
  el.listView.hidden = isSettings;
  el.composer.hidden = isSettings;

  updateStats();
  if (!isSettings) renderList();
}

function openEdit(todo) {
  state.editingId = todo.id;
  el.editText.value = todo.text;
  el.editPriority.value = todo.priority;
  el.editDate.value = todo.date || "";
  el.editDialog.showModal();
}

function openConfirm({ title, body, okText, onOk }) {
  el.confirmTitle.textContent = title;
  el.confirmBody.textContent = body;
  el.confirmOk.textContent = okText;
  state.confirmAction = onOk;
  el.confirmDialog.showModal();
}

async function addTodo() {
  const text = el.input.value.trim();
  if (!text) {
    setHint("请输入待办内容");
    return;
  }
  if (text.length > 200) {
    setHint("内容不能超过 200 字");
    return;
  }

  const todo = {
    id: uid(),
    text,
    priority: el.priority.value,
    date: el.date.value || null,
    done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.todos.unshift(todo);
  await persist();
  el.input.value = "";
  setHint("");
  if (state.view === "done") state.view = "today";
  render();
  showToast("已添加");
  el.input.focus();
}

function bindEvents() {
  el.nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-item");
    if (!btn) return;
    state.view = btn.dataset.view;
    setHint("");
    render();
  });

  el.addBtn.addEventListener("click", addTodo);
  el.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTodo();
  });

  el.themeBtn.addEventListener("click", () => {
    const order = ["light", "dark", "system"];
    const idx = order.indexOf(state.settings.theme);
    state.settings.theme = order[(idx + 1) % order.length];
    el.themeSelect.value = state.settings.theme;
    saveSettings();
  });

  el.themeSelect.addEventListener("change", () => {
    state.settings.theme = el.themeSelect.value;
    saveSettings();
  });

  el.defaultView.addEventListener("change", () => {
    state.settings.defaultView = el.defaultView.value;
    saveSettings();
  });

  el.defaultPriority.addEventListener("change", () => {
    state.settings.defaultPriority = el.defaultPriority.value;
    el.priority.value = el.defaultPriority.value;
    saveSettings();
  });

  el.exportBtn.addEventListener("click", async () => {
    const res = await window.api.exportTodos();
    if (res.ok) showToast("已导出");
  });

  el.importBtn.addEventListener("click", async () => {
    const res = await window.api.importTodos();
    if (res.ok) {
      state.todos = res.todos;
      render();
      showToast(`已导入 ${res.todos.length} 条待办`);
    } else if (!res.canceled) {
      showToast(res.error || "导入失败");
    }
  });

  el.clearDoneBtn.addEventListener("click", () => {
    openConfirm({
      title: "清空已完成任务？",
      body: "此操作无法撤销。",
      okText: "清空",
      onOk: async () => {
        const before = state.todos.length;
        state.todos = state.todos.filter((t) => !t.done);
        await persist();
        render();
        showToast(`已清除 ${before - state.todos.length} 条`);
      },
    });
  });

  el.editCancel.addEventListener("click", () => el.editDialog.close());
  el.confirmCancel.addEventListener("click", () => el.confirmDialog.close());

  el.editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = el.editText.value.trim();
    if (!text) return;
    const todo = state.todos.find((t) => t.id === state.editingId);
    if (!todo) return;
    todo.text = text;
    todo.priority = el.editPriority.value;
    todo.date = el.editDate.value || null;
    todo.updatedAt = new Date().toISOString();
    await persist();
    el.editDialog.close();
    render();
    showToast("已保存");
  });

  el.confirmDialog.addEventListener("close", async () => {
    if (el.confirmDialog.returnValue === "ok" && state.confirmAction) {
      const action = state.confirmAction;
      state.confirmAction = null;
      await action();
    }
    state.confirmAction = null;
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (state.settings.theme === "system") applyTheme("system");
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (el.editDialog.open) el.editDialog.close();
      if (el.confirmDialog.open) el.confirmDialog.close();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
      e.preventDefault();
      if (state.view === "settings") {
        state.view = state.settings.defaultView;
        render();
      }
      el.input.focus();
    }
  });
}

async function init() {
  loadSettings();
  state.todos = (await window.api.loadTodos()) || [];
  state.view = state.settings.defaultView || "today";
  el.date.value = todayISO();
  bindEvents();
  render();
}

init();
