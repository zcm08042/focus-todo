# Focus Todo

一个只存在于本机的简单待办桌面应用。  
面向简历 / 作品集：小而完整，界面干净，数据不上传。

## 功能

- 添加 / 完成 / 编辑 / 删除待办
- 优先级：高 / 中 / 低
- 视图：今日 / 全部 / 已完成
- 本地 JSON 持久化
- 浅色 / 深色 / 跟随系统
- 导入导出 JSON
- 快捷键：Enter 添加、Ctrl+N 聚焦、Esc 关闭弹窗

## 技术

- Electron
- 原生 HTML / CSS / JavaScript
- 无账号、无云同步

## 开发

```bash
npm install
npm start
```

## 打包（可选）

```bash
npm run dist
```

## 项目结构

```
.
├── main.js          # Electron 主进程
├── preload.js       # 预加载桥接
├── src/
│   ├── index.html   # 界面
│   ├── styles.css   # 样式
│   └── renderer.js  # 渲染逻辑
├── package.json
└── README.md
```

## License

MIT
