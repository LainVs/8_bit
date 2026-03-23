# 🎹 8-Bit Sound Lab

一个极其现代且极简的在线音频复古化工具。支持实时位深度压缩、采样率降低以及多种怀旧风格模拟。

![Sound Lab](https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/music.svg)

## ✨ 特性

- **实时复古效果**：通过位压缩器 (BitCrusher) 实时将高码率音频转为 8-Bit 或低保真效果。
- **四大怀旧风格**：
  - **8-Bit (Chiptune)**: 模拟红白机时代的经典电子声。
  - **Retro**: 暖色调的复古采样感。
  - **Radio**: 模拟老式收音机的带通滤波效果。
  - **VHS**: 模拟录像带的音高抖动 (Wow & Flutter) 与低通滤波。
- **直观交互**：支持文件拖拽上传，界面极简且响应迅速。
- **离线导出**：
  - **WAV**: 导出处理后的高品质音频。
  - **LOGIC**: 生成基于音量阈值的节奏时序分析文档。

## 🚀 快速开始

### 依赖安装
项目基于 **Vite + React** 构建。请确保已安装 Node.js。

```bash
npm install
```

### 本地开发
启动开发服务器：

```bash
npm run dev
```

打开浏览器访问 `http://localhost:5173` 即可开始创作。

## 🛠️ 技术栈

- **前端框架**: [React 18](https://reactjs.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **图标库**: [Lucide React](https://lucide.dev/)
- **音频引擎**: Web Audio API (实时处理) + Web Workers (离线导出)
- **样式**: 原生 CSS (现代极简设计语言)

## 📝 最近更新

- ✅ 修复了在某些环境下添加音乐导致页面白屏的 Bug。
- ✅ 完善了文件识别逻辑，支持更多音频格式。
- ✅ 增加了拖拽上传功能。
- ✅ 优化了音频节点的内存管理与初始化竞态保护。

## 📄 开源协议
MIT
