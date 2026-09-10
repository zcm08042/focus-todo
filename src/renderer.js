const PRIORITIES = ["high", "medium", "low"];
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: "高", medium: "中", low: "低" };

const state = {
  todos: [],
  view: "today",
  settings: {
    theme: "light",
    defaultView: "today",
    defaultPriority: "medium",
  },
  filters: {
    query: "",
    priority: "all",
    sort: "created",
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
  search: document.getElementById("search"),
  filters: document.getElementById("filters"),
  sort: document.getElementById("sort"),
  list: document.getElementById("list"),
  empty: document.getElementById("empty"),
  emptyTitle: document.getElementById("emptyTitle"),
  emptyDesc: document.getElementById("emptyDesc"),
  listView: document.getElementById("listView"),
  settingsView: document.getElementById("settingsView"),
  composer: document.getElementById("composer"),
  toolbar: document.getElementById("toolbar"),
  statLabel: document.getElementById("statLabel"),
  statValue: document.getElementById("statValue"),
  progressBar: document.getElementById("progressBar"),
  navCountToday: document.getElementById("navCountToday"),
  navCountAll: document.getElementById("navCountAll"),
  navCountDone: document.getElementById("navCountDone"),
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
    emptyFiltered: "没有匹配的待办",
    emptyFilteredDesc: "试试调整搜索词或筛选条件",
  },
  all: {
    title: "全部",
    emptyTitle: "还没有待办",
    emptyDesc: "先记下一件要做的事",
    emptyFiltered: "没有匹配的待办",
    emptyFilteredDesc: "试试调整搜索词或筛选条件",
  },
  done: {
    title: "已完成",
    emptyTitle: "还没有完成的任务",
    emptyDesc: "完成后会出现在这里",
    emptyFiltered: "没有匹配的已完成任务",
    emptyFilteredDesc: "试试调整搜索词或筛选条件",
  },
  settings: {
    title: "设置",
  },
};

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

function clampText(text) {
  return String(text || "").trim().slice(0, 200);
}

function normalizeTodo(raw, index = 0) {
  if (!raw || typeof raw !== "object") return null;
  const text = clampText(raw.text);
  if (!text) return null;
  const priority = PRIORITIES.includes(raw.priority) ? raw.priority : "medium";
  const date =
    typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
      ? raw.date
      : null;
  const createdAt =
    typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString();
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `${uid()}-${index}`,
    text,
    priority,
    date,
    done: Boolean(raw.done),
    createdAt,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt,
  };
}

function normalizeTodos(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeTodo).filter(Boolean);
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.toast.hidden = true;
  }, 1800);
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
    if (raw) {
      const parsed = JSON.parse(raw);
      state.settings = {
        theme: ["light", "dark", "system"].includes(parsed.theme)
          ? parsed.theme
          : "light",
        defaultView: ["today", "all"].includes(parsed.defaultView)
          ? parsed.defaultView
          : "today",
        defaultPriority: PRIORITIES.includes(parsed.defaultPriority)
          ? parsed.defaultPriority
          : "medium",
      };
    }
  } catch {
    /* keep defaults */
  }

  el.themeSelect.value = state.settings.theme;
  el.defaultView.value = state.settings.defaultView;
  el.defaultPriority.value = state.settings.defaultPriority;
  el.priority.value = state.settings.defaultPriority;
  applyTheme(state.settings.theme);
}

function saveSettings() {
  try {
    localStorage.setItem("focus-todo-settings", JSON.stringify(state.settings));
  } catch {
    /* ignore quota errors */
  }
  applyTheme(state.settings.theme);
}

async function persist() {
  const result = await window.api.saveTodos(state.todos);
  if (result && result.ok) {
    state.todos = result.todos || state.todos;
    return true;
  }
  showToast("保存失败，请重试");
  return false;
}

function matchesFilters(todo) {
  const q = state.filters.query.trim().toLowerCase();
  if (q && !todo.text.toLowerCase().includes(q)) return false;
  if (
    state.filters.priority !== "all" &&
    todo.priority !== state.filters.priority
  ) {
    return false;
  }
  return true;
}

function sortTodos(list) {
  const copy = [...list];
  const mode = state.filters.sort;
  copy.sort((a, b) => {
    if (mode === "priority") {
      const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (diff !== 0) return diff;
    }
    if (mode === "date") {
      const ad = a.date || "9999-12-31";
      const bd = b.date || "9999-12-31";
      if (ad !== bd) return ad < bd ? -1 : 1;
    }
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
  });
  return copy;
}

function baseTodosForView() {
  if (state.view === "today") {
    return state.todos.filter((t) => !t.done && t.date === todayISO());
  }
  if (state.view === "done") {
    return state.todos.filter((t) => t.done);
  }
  if (state.view === "all") {
    return state.todos.filter((t) => !t.done);
  }
  return [];
}

function hasActiveFilter() {
  return Boolean(state.filters.query.trim()) || state.filters.priority !== "all";
}

function visibleTodos() {
  return sortTodos(baseTodosForView().filter(matchesFilters));
}

function updateNavCounts() {
  const today = todayISO();
  const todayCount = state.todos.filter((t) => !t.done && t.date === today).length;
  const allCount = state.todos.filter((t) => !t.done).length;
  const doneCount = state.todos.filter((t) => t.done).length;

  el.navCountToday.textContent = todayCount ? String(todayCount) : "";
  el.navCountAll.textContent = allCount ? String(allCount) : "";
  el.navCountDone.textContent = doneCount ? String(doneCount) : "";
}

function updateStats() {
  updateNavCounts();

  if (state.view === "settings") {
    el.statLabel.textContent = "本地存储";
    el.statValue.textContent = `${state.todos.length} 条`;
    el.progressBar.style.width = "0%";
    return;
  }

  const todayAll = state.todos.filter((t) => t.date === todayISO());
  const done = todayAll.filter((t) => t.done).length;
  const total = todayAll.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  el.statLabel.textContent = "今日完成";
  el.statValue.textContent = `${done} / ${total}`;
  el.progressBar.style.width = `${pct}%`;
}

function createTodoItem(todo, today) {
  const li = document.createElement("li");
  li.className = "todo-item" + (todo.done ? " done" : "");
  li.dataset.id = todo.id;

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "check";
  check.checked = todo.done;
  check.setAttribute("aria-label", todo.done ? "标记为未完成" : "标记为完成");
  check.addEventListener("change", async () => {
    todo.done = check.checked;
    todo.updatedAt = new Date().toISOString();
    const ok = await persist();
    if (ok) render();
    else {
      check.checked = !todo.done;
      todo.done = !check.checked;
    }
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
  pChip.textContent = PRIORITY_LABEL[todo.priority] || "中";
  meta.appendChild(pChip);

  if (todo.date) {
    const overdue = !todo.done && todo.date < today;
    const dChip = document.createElement("span");
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
        const ok = await persist();
        if (ok) {
          render();
          showToast("已删除");
        }
      },
    })
  );

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  li.appendChild(check);
  li.appendChild(body);
  li.appendChild(actions);
  return li;
}

function renderList() {
  const todos = visibleTodos();
  const today = todayISO();
  el.list.innerHTML = "";

  if (!todos.length) {
    const meta = viewMeta[state.view];
    el.empty.hidden = false;
    if (hasActiveFilter()) {
      el.emptyTitle.textContent = meta.emptyFiltered;
      el.emptyDesc.textContent = meta.emptyFilteredDesc;
    } else {
      el.emptyTitle.textContent = meta.emptyTitle;
      el.emptyDesc.textContent = meta.emptyDesc;
    }
    return;
  }

  el.empty.hidden = true;
  const frag = document.createDocumentFragment();
  for (const todo of todos) {
    frag.appendChild(createTodoItem(todo, today));
  }
  el.list.appendChild(frag);
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
  el.toolbar.hidden = isSettings;
  el.hint.hidden = isSettings;

  updateStats();
  if (!isSettings) renderList();
}

function openEdit(todo) {
  state.editingId = todo.id;
  el.editText.value = todo.text;
  el.editPriority.value = todo.priority;
  el.editDate.value = todo.date || "";
  el.editDialog.showModal();
  requestAnimationFrame(() => el.editText.focus());
}

function openConfirm({ title, body, okText, onOk }) {
  el.confirmTitle.textContent = title;
  el.confirmBody.textContent = body;
  el.confirmOk.textContent = okText;
  state.confirmAction = onOk;
  el.confirmDialog.showModal();
}

async function addTodo() {
  const text = clampText(el.input.value);
  if (!text) {
    setHint("请输入待办内容");
    el.input.focus();
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

  const next = [todo, ...state.todos];
  const previous = state.todos;
  state.todos = next;
  const ok = await persist();
  if (!ok) {
    state.todos = previous;
    return;
  }

  el.input.value = "";
  setHint("");
  if (state.view === "done") state.view = "today";
  if (state.filters.priority !== "all" && state.filters.priority !== todo.priority) {
    state.filters.priority = "all";
    syncFilterChips();
  }
  render();
  showToast("已添加");
  el.input.focus();
}

function syncFilterChips() {
  el.filters.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.classList.toggle(
      "active",
      chip.dataset.priority === state.filters.priority
    );
  });
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

  el.search.addEventListener("input", () => {
    state.filters.query = el.search.value;
    if (state.view !== "settings") renderList();
  });

  el.filters.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    state.filters.priority = chip.dataset.priority;
    syncFilterChips();
    if (state.view !== "settings") renderList();
  });

  el.sort.addEventListener("change", () => {
    state.filters.sort = el.sort.value;
    if (state.view !== "settings") renderList();
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
    if (res.ok) showToast(`已导出 ${res.count ?? ""} 条`.trim());
    else if (!res.canceled) showToast(res.error || "导出失败");
  });

  el.importBtn.addEventListener("click", async () => {
    const res = await window.api.importTodos();
    if (res.ok) {
      state.todos = normalizeTodos(res.todos);
      render();
      showToast(`已导入 ${state.todos.length} 条待办`);
    } else if (!res.canceled) {
      showToast(res.error || "导入失败");
    }
  });

  el.clearDoneBtn.addEventListener("click", () => {
    const doneCount = state.todos.filter((t) => t.done).length;
    if (!doneCount) {
      showToast("还没有已完成任务");
      return;
    }
    openConfirm({
      title: "清空已完成任务？",
      body: `将删除 ${doneCount} 条已完成任务，此操作无法撤销。`,
      okText: "清空",
      onOk: async () => {
        state.todos = state.todos.filter((t) => !t.done);
        const ok = await persist();
        if (ok) {
          render();
          showToast(`已清除 ${doneCount} 条`);
        }
      },
    });
  });

  el.editCancel.addEventListener("click", () => el.editDialog.close());
  el.confirmCancel.addEventListener("click", () => el.confirmDialog.close());

  el.editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = clampText(el.editText.value);
    if (!text) return;
    const todo = state.todos.find((t) => t.id === state.editingId);
    if (!todo) return;

    const prev = { ...todo };
    todo.text = text;
    todo.priority = el.editPriority.value;
    todo.date = el.editDate.value || null;
    todo.updatedAt = new Date().toISOString();

    const ok = await persist();
    if (!ok) {
      Object.assign(todo, prev);
      return;
    }
    el.editDialog.close();
    render();
    showToast("已保存");
  });

  el.confirmDialog.addEventListener("close", async () => {
    const action = state.confirmAction;
    state.confirmAction = null;
    if (el.confirmDialog.returnValue === "ok" && action) {
      await action();
    }
  });

  el.editDialog.addEventListener("close", () => {
    state.editingId = null;
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (state.settings.theme === "system") applyTheme("system");
    });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (el.editDialog.open) el.editDialog.close();
      if (el.confirmDialog.open) el.confirmDialog.close();
    }

    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "n") {
      e.preventDefault();
      if (state.view === "settings") {
        state.view = state.settings.defaultView;
        render();
      }
      el.input.focus();
    }

    if (mod && e.key.toLowerCase() === "f") {
      e.preventDefault();
      if (state.view === "settings") {
        state.view = state.settings.defaultView;
        render();
      }
      el.search.focus();
    }

    if (mod && ["1", "2", "3"].includes(e.key)) {
      e.preventDefault();
      const map = { "1": "today", "2": "all", "3": "done" };
      state.view = map[e.key];
      render();
    }
  });
}

async function init() {
  loadSettings();
  const loaded = await window.api.loadTodos();
  state.todos = normalizeTodos(loaded);
  state.view = state.settings.defaultView || "today";
  el.date.value = todayISO();
  syncFilterChips();
  bindEvents();
  render();
}

init();
