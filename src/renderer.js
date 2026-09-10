const PRIORITIES = ["high", "medium", "low"];
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: "高", medium: "中", low: "低" };
const EMPTY_FILTERED = {
  title: "没有匹配的待办",
  desc: "试试调整搜索词或筛选条件",
};

// Electron preload 提供 window.api；移动端/网页用 localStorage 兜底
if (!window.api) {
  const KEY = "focus-todo-todos";
  window.api = {
    async loadTodos() {
      try {
        return JSON.parse(localStorage.getItem(KEY) || "[]");
      } catch {
        return [];
      }
    },
    async saveTodos(todos) {
      localStorage.setItem(KEY, JSON.stringify(todos));
      return { ok: true, todos };
    },
    async exportTodos() {
      const todos = await this.loadTodos();
      const blob = new Blob([JSON.stringify(todos, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "focus-todo-backup.json";
      a.click();
      URL.revokeObjectURL(a.href);
      return { ok: true, count: todos.length };
    },
    async importTodos() {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return resolve({ ok: false, canceled: true });
          try {
            const data = JSON.parse(await file.text());
            if (!Array.isArray(data)) throw new Error("bad");
            localStorage.setItem(KEY, JSON.stringify(data));
            resolve({ ok: true, todos: data });
          } catch {
            resolve({ ok: false, error: "文件格式不正确" });
          }
        };
        input.click();
      });
    },
  };
}

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
  statsView: document.getElementById("statsView"),
  statsCards: document.getElementById("statsCards"),
  weekChart: document.getElementById("weekChart"),
  priorityBars: document.getElementById("priorityBars"),
  settingsView: document.getElementById("settingsView"),
  composer: document.getElementById("composer"),
  toolbar: document.getElementById("toolbar"),
  statLabel: document.getElementById("statLabel"),
  statValue: document.getElementById("statValue"),
  progressBar: document.getElementById("progressBar"),
  navCountToday: document.getElementById("navCountToday"),
  navCountAll: document.getElementById("navCountAll"),
  navCountDone: document.getElementById("navCountDone"),
  navCountDue: document.getElementById("navCountDue"),
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
  due: {
    title: "到期",
    emptyTitle: "没有到期任务",
    emptyDesc: "给待办设置日期后，会出现在这里",
  },
  stats: { title: "统计" },
  settings: { title: "设置" },
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
    const parsed = JSON.parse(localStorage.getItem("focus-todo-settings"));
    if (parsed) {
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
  } catch {}

  el.themeSelect.value = state.settings.theme;
  el.defaultView.value = state.settings.defaultView;
  el.defaultPriority.value = state.settings.defaultPriority;
  el.priority.value = state.settings.defaultPriority;
  applyTheme(state.settings.theme);
}

function saveSettings() {
  try {
    localStorage.setItem("focus-todo-settings", JSON.stringify(state.settings));
  } catch {}
  applyTheme(state.settings.theme);
}

async function persist() {
  const result = await window.api.saveTodos(state.todos);
  if (result?.ok) {
    state.todos = result.todos;
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
  const mode = state.filters.sort;
  return [...list].sort((a, b) => {
    if (mode === "priority") {
      const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (diff) return diff;
    }
    if (mode === "date") {
      const ad = a.date || "9999-12-31";
      const bd = b.date || "9999-12-31";
      if (ad !== bd) return ad < bd ? -1 : 1;
    }
    return a.createdAt < b.createdAt ? 1 : -1;
  });
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
  if (state.view === "due") {
    return state.todos.filter((t) => !t.done && t.date);
  }
  return [];
}

function hasActiveFilter() {
  return Boolean(state.filters.query.trim()) || state.filters.priority !== "all";
}

function visibleTodos() {
  return sortTodos(baseTodosForView().filter(matchesFilters));
}

function updateStats() {
  const today = todayISO();
  const dueCount = state.todos.filter((t) => !t.done && t.date && t.date <= today).length;
  el.navCountToday.textContent =
    String(state.todos.filter((t) => !t.done && t.date === today).length) || "";
  el.navCountAll.textContent =
    String(state.todos.filter((t) => !t.done).length) || "";
  el.navCountDone.textContent =
    String(state.todos.filter((t) => t.done).length) || "";
  el.navCountDue.textContent = String(dueCount) || "";

  if (state.view === "settings") {
    el.statLabel.textContent = "本地存储";
    el.statValue.textContent = `${state.todos.length} 条`;
    el.progressBar.style.width = "0%";
    return;
  }

  const todayAll = state.todos.filter((t) => t.date === today);
  const done = todayAll.filter((t) => t.done).length;
  el.statLabel.textContent = "今日完成";
  el.statValue.textContent = `${done} / ${todayAll.length}`;
  el.progressBar.style.width = todayAll.length
    ? `${Math.round((done / todayAll.length) * 100)}%`
    : "0%";
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
    todo.completedAt = check.checked ? new Date().toISOString() : null;
    if (await persist()) render();
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
  pChip.textContent = PRIORITY_LABEL[todo.priority];
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

  body.append(text, meta);

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
        if (await persist()) {
          render();
          showToast("已删除");
        }
      },
    })
  );

  actions.append(editBtn, delBtn);
  li.append(check, body, actions);
  return li;
}

function renderList() {
  const today = todayISO();
  el.list.innerHTML = "";

  if (state.view === "due") {
    renderDueList(today);
    return;
  }

  const todos = visibleTodos();
  if (!todos.length) {
    const meta = viewMeta[state.view];
    const filtered = hasActiveFilter();
    el.empty.hidden = false;
    el.emptyTitle.textContent = filtered ? EMPTY_FILTERED.title : meta.emptyTitle;
    el.emptyDesc.textContent = filtered ? EMPTY_FILTERED.desc : meta.emptyDesc;
    return;
  }

  el.empty.hidden = true;
  for (const todo of todos) {
    el.list.appendChild(createTodoItem(todo, today));
  }
}

function renderDueList(today) {
  const todos = visibleTodos().sort((a, b) =>
    a.date === b.date
      ? a.createdAt < b.createdAt
        ? 1
        : -1
      : a.date < b.date
        ? -1
        : 1
  );

  if (!todos.length) {
    const meta = viewMeta.due;
    const filtered = hasActiveFilter();
    el.empty.hidden = false;
    el.emptyTitle.textContent = filtered ? EMPTY_FILTERED.title : meta.emptyTitle;
    el.emptyDesc.textContent = filtered ? EMPTY_FILTERED.desc : meta.emptyDesc;
    return;
  }

  el.empty.hidden = true;
  const groups = [
    { key: "overdue", label: "已过期", items: todos.filter((t) => t.date < today) },
    { key: "today", label: "今天", items: todos.filter((t) => t.date === today) },
    { key: "upcoming", label: "以后", items: todos.filter((t) => t.date > today) },
  ];

  for (const group of groups) {
    if (!group.items.length) continue;
    const label = document.createElement("li");
    label.className = "group-label" + (group.key === "overdue" ? " overdue" : "");
    label.textContent = `${group.label} · ${group.items.length}`;
    el.list.appendChild(label);
    for (const todo of group.items) {
      el.list.appendChild(createTodoItem(todo, today));
    }
  }
}

function dayKey(iso) {
  return String(iso || "").slice(0, 10);
}

function renderStats() {
  const today = todayISO();
  const done = state.todos.filter((t) => t.done);
  const active = state.todos.filter((t) => !t.done);
  const overdue = active.filter((t) => t.date && t.date < today);

  el.statsCards.innerHTML = "";
  for (const [label, value] of [
    ["总任务", state.todos.length],
    ["已完成", done.length],
    ["未完成", active.length],
    ["已过期", overdue.length],
  ]) {
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `<div class="label"></div><div class="value"></div>`;
    card.querySelector(".label").textContent = label;
    card.querySelector(".value").textContent = value;
    el.statsCards.appendChild(card);
  }

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dayKey(d.toISOString()));
  }
  const counts = days.map(
    (day) => done.filter((t) => dayKey(t.completedAt) === day).length
  );
  const max = Math.max(1, ...counts);
  const week = ["日", "一", "二", "三", "四", "五", "六"];

  el.weekChart.innerHTML = "";
  days.forEach((day, i) => {
    const col = document.createElement("div");
    col.className = "chart-col";
    const n = counts[i];
    col.innerHTML = `
      <div class="chart-count"></div>
      <div class="chart-bar-wrap"><div class="chart-bar"></div></div>
      <div class="chart-day"></div>
    `;
    col.querySelector(".chart-count").textContent = n;
    const bar = col.querySelector(".chart-bar");
    if (!n) bar.classList.add("zero");
    else bar.style.height = `${Math.max(8, Math.round((n / max) * 100))}%`;
    const dt = new Date(day + "T12:00:00");
    col.querySelector(".chart-day").textContent = week[dt.getDay()];
    col.title = `${day}：完成 ${n} 条`;
    el.weekChart.appendChild(col);
  });

  const byPriority = {
    high: active.filter((t) => t.priority === "high").length,
    medium: active.filter((t) => t.priority === "medium").length,
    low: active.filter((t) => t.priority === "low").length,
  };
  const pMax = Math.max(1, ...Object.values(byPriority));
  el.priorityBars.innerHTML = "";
  for (const key of ["high", "medium", "low"]) {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span></span>
      <div class="bar-track"><div class="bar-fill"></div></div>
      <span class="bar-num"></span>
    `;
    row.children[0].textContent = PRIORITY_LABEL[key];
    const fill = row.querySelector(".bar-fill");
    fill.classList.add(key);
    fill.style.width = `${Math.round((byPriority[key] / pMax) * 100)}%`;
    row.querySelector(".bar-num").textContent = byPriority[key];
    el.priorityBars.appendChild(row);
  }
}

function render() {
  el.dateLine.textContent = formatDateLine();
  el.viewTitle.textContent = viewMeta[state.view].title;

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === state.view);
  });

  const isSettings = state.view === "settings";
  const isStats = state.view === "stats";
  const hideListChrome = isSettings || isStats;

  el.settingsView.hidden = !isSettings;
  el.statsView.hidden = !isStats;
  el.listView.hidden = hideListChrome;
  el.composer.hidden = hideListChrome;
  el.toolbar.hidden = hideListChrome;
  el.hint.hidden = hideListChrome;

  updateStats();
  if (isStats) renderStats();
  else if (!isSettings) renderList();
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

  state.todos.unshift({
    id: uid(),
    text,
    priority: el.priority.value,
    date: el.date.value || null,
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  });

  if (!(await persist())) return;

  el.input.value = "";
  setHint("");
  if (state.view === "done") state.view = "today";
  if (
    state.filters.priority !== "all" &&
    state.filters.priority !== el.priority.value
  ) {
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
    state.settings.theme =
      order[(order.indexOf(state.settings.theme) + 1) % order.length];
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
    if (res.ok) showToast(`已导出 ${res.count} 条`);
    else if (!res.canceled) showToast(res.error || "导出失败");
  });

  el.importBtn.addEventListener("click", async () => {
    const res = await window.api.importTodos();
    if (res.ok) {
      state.todos = res.todos;
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
        if (await persist()) {
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
    todo.text = text;
    todo.priority = el.editPriority.value;
    todo.date = el.editDate.value || null;
    if (!(await persist())) return;
    el.editDialog.close();
    render();
    showToast("已保存");
  });

  el.confirmDialog.addEventListener("close", async () => {
    const action = state.confirmAction;
    state.confirmAction = null;
    if (el.confirmDialog.returnValue === "ok" && action) await action();
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
    if (mod && ["1", "2", "3", "4", "5"].includes(e.key)) {
      e.preventDefault();
      state.view = {
        "1": "today",
        "2": "all",
        "3": "done",
        "4": "due",
        "5": "stats",
      }[e.key];
      render();
    }
  });
}

async function init() {
  loadSettings();
  state.todos = await window.api.loadTodos();
  state.view = state.settings.defaultView;
  el.date.value = todayISO();
  syncFilterChips();
  bindEvents();
  render();
}

init();
