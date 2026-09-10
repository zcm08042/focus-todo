# Focus Todo

一个只存在于本机的简洁桌面待办应用。  
Electron + 原生 HTML/CSS/JS，适合放入简历与作品集。

![license](https://img.shields.io/badge/license-MIT-green)
![electron](https://img.shields.io/badge/Electron-33-blue)
![platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

## 为什么做这个

Focus Todo 不追求功能堆砌，而是完整走通一个桌面产品的最小闭环：

- 界面干净，深浅色主题
- 本地持久化，数据不上传
- 添加 / 完成 / 编辑 / 删除
- 搜索、优先级筛选、排序
- 导入导出 JSON
- 快捷键操作

## 功能

| 模块 | 说明 |
|------|------|
| 今日 / 全部 / 已完成 / 到期 | 按场景管理任务；到期按过期/今天/以后分组 |
| 优先级 | 高 / 中 / 低，可筛选可排序 |
| 日期 | 支持设置日期，过期自动标记 |
| 启动通知 | 有到期或过期任务时，系统通知一次 |
| 搜索 | 按内容即时过滤 |
| 主题 | 浅色 / 深色 / 跟随系统 |
| 数据 | 本地 JSON；可导出备份、导入恢复 |
| 快捷键 | Enter、Ctrl+N、Ctrl+F、Ctrl+1/2/3/4 |

## 界面预览

打开应用后可看到侧栏导航、添加区、筛选栏与任务列表。  
深色模式可在右上角一键切换。

## 快速开始

```bash
# 安装依赖
npm install

# 启动
npm start
```

## 快捷键

| 快捷键 | 作用 |
|--------|------|
| Enter | 添加待办 |
| Ctrl/Cmd + N | 聚焦添加输入框 |
| Ctrl/Cmd + F | 聚焦搜索 |
| Ctrl/Cmd + 1 / 2 / 3 | 切换 今日 / 全部 / 已完成 |

## 技术栈

- Electron 33
- 原生 HTML / CSS / JavaScript
- 主进程本地文件读写（`userData/todos.json`）
- 渲染进程无 Node 权限（contextIsolation + preload）

## 项目结构

```text
focus-todo/
├── main.js              # Electron 主进程
├── preload.js           # 安全桥接 IPC
├── src/
│   ├── index.html       # 界面结构
│   ├── styles.css       # 样式与主题
│   └── renderer.js      # 交互逻辑
├── package.json
└── README.md
```

## 隐私

- 所有数据保存在本机应用目录
- 无账号、无云同步、无埋点
- 可随时导出为 JSON 备份

## License

MIT
