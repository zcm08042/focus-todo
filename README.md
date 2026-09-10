# Focus Todo

> **Focus Todo** — 只存在于本机的简洁待办。  
> 不联网、不上传、无需账号。打开就能记，关掉数据还在本机。

一个用 **Electron + Capacitor + 原生 HTML/CSS/JS** 写的效率小应用：  
**Windows 桌面版** + **Android APK**，同一套界面。

![license](https://img.shields.io/badge/license-MIT-green)
![electron](https://img.shields.io/badge/Electron-33-blue)
![capacitor](https://img.shields.io/badge/Capacitor-6-blue)
![version](https://img.shields.io/badge/version-1.3.0-blue)
![platform](https://img.shields.io/badge/platform-Windows%20%7C%20Android-lightgrey)

## 名称说明

| 项 | 内容 |
|----|------|
| 项目名 | Focus Todo |
| 应用名 | Focus Todo |
| 包名 | `focus-todo` / `com.zcm08042.focustodo` |
| 定位 | 本地优先待办（Local-first todo） |
| 一句话 | 专注今天该做的事，数据只留在你的设备上 |

## 简介

Focus Todo 把「记事 → 排期 → 完成 → 复盘」收进一个安静的桌面窗口：

1. **记**：快速添加待办，设优先级和日期  
2. **看**：今日 / 全部 / 到期分组，一眼知道要做什么  
3. **做**：勾选完成，启动时如有到期任务会系统提醒  
4. **盘**：统计页看近 7 天完成情况和未完成分布  

**设计原则：** 少即是多。能本地就不联网，能原生控件就不堆依赖，界面干净可扫读。

## 功能一览

| 模块 | 说明 |
|------|------|
| 今日 / 全部 / 已完成 / 到期 / 统计 | 多视图管理任务 |
| 到期视图 | 已过期 → 今天 → 以后 分组 |
| 统计 | 汇总、近 7 天完成柱状图、优先级分布 |
| 优先级 | 高 / 中 / 低，可筛选排序 |
| 日期 | 设置到期日，过期高亮 |
| 启动通知 | 有到期/过期任务时弹一次系统通知 |
| 搜索筛选 | 按内容即时过滤 |
| 主题 | 浅色 / 深色 / 跟随系统 |
| 数据 | 本地 JSON；可导出 / 导入备份 |
| 快捷键 | Enter、Ctrl+N、Ctrl+F、Ctrl+1–5 |

## 界面

- 左侧导航 + 主内容区  
- 添加区：内容、优先级、日期  
- 右上角一键切换深浅色  

## 下载安装

发布页：https://github.com/zcm08042/focus-todo/releases  

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `Focus Todo Setup 1.3.0.exe` | 双击安装 |
| Android | `Focus-Todo-1.3.0-android.apk` | 允许安装未知来源后安装（debug 签名） |

自行打包：

```powershell
git clone https://github.com/zcm08042/focus-todo.git
cd focus-todo
npm install
npm start              # 桌面开发运行
npm run dist           # Windows 安装包
npm run apk:debug      # Android debug APK（需 JDK17 + Android SDK）
```

## 快速开始（开发）

```bash
npm install
npm start
```

Android 需要本机已配置：

- JDK 17  
- `ANDROID_HOME` / `ANDROID_SDK_ROOT`  
- 已接受 SDK licenses  

## 快捷键

| 快捷键 | 作用 |
|--------|------|
| Enter | 添加待办 |
| Ctrl/Cmd + N | 聚焦添加输入框 |
| Ctrl/Cmd + F | 聚焦搜索 |
| Ctrl/Cmd + 1–5 | 切换 今日 / 全部 / 已完成 / 到期 / 统计 |

## 技术栈

- Electron 33（桌面）  
- Capacitor 6 + Android（移动端）  
- 原生 HTML / CSS / JavaScript  
- 桌面：主进程本地 JSON（`userData`）  
- 移动：localStorage 本地存储  
- 渲染进程无 Node 权限（contextIsolation + preload）  

## 项目结构

```text
focus-todo/
├── main.js              # Electron 主进程
├── preload.js           # 安全桥接 IPC
├── src/                 # 共享 Web UI（桌面 + Android）
├── android/             # Capacitor Android 工程
├── assets/
│   └── icon.png         # 应用图标
├── capacitor.config.ts
├── package.json
└── README.md
```

## 隐私

- 所有数据保存在本机应用目录  
- 无账号、无云同步、无埋点  
- 可随时导出为 JSON 备份  

## 作者

**zcm08042** · https://github.com/zcm08042  

## License

MIT
