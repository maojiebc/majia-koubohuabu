# 架构说明

## 总体数据流

```text
portrait-talk-theme-kit 原始 token (只读)
                    │
                    ├─ themes.json ─────┐
                    │                        │
compositions.json ────────├──> dual-studio.js ──> 浏览器预览
                                             │
用户本地图片 / 视频 ─ Object URL ─────┘
                                             │
                                             ├─ PNG / SVG
                                             ├─ Scene JSON
                                             ├─ ChatCut JSX
                                             └─ Markdown handoff
```

## 源码层

### `src/index.html`

- 产品说明、配置面板、预览 DOM、导出控制台。
- 重要可见内容都存在于 HTML，不依赖 SPA 渲染完成 SEO 主文案。
- 资源路径以 `/koubo` 为公开部署前缀。

### `src/dual-studio.css`

- 页面 UI 与固定视频画布的视觉系统。
- 页面外层允许响应式；`.video-canvas` 内部只使用固定像素坐标，由外层等比例缩放。

### `src/dual-studio.js`

- 读取原始 theme token 和双画面 composition registry。
- 管理本地素材 Object URL，不发起素材上传请求。
- 在同一份状态上生成预览、PNG、SVG、JSON、JSX 和 Markdown。
- 状态持久化只保存文字和选项，不保存用户媒体数据。

## 数据层

### `config/compositions.json`

是横竖版双素材布局的唯一真相源。每个布局包含：

- 稳定、唯一的 `id` 与 `layoutVersion`。
- `screen`、`speaker`、`title`、`point`、`subtitle` 固定坐标。
- 默认 `screenFit` 和 `speakerShape`。
- 人类可读的名称与使用说明。

网页不应维护第二套坐标常量。导出器必须读取同一 layout object。

### `vendor/portrait-talk-theme-kit/`

原始配色包的完整展开版。保留是为了：

- 在线工具读取 8 套原始语义 token。
- 保留 SVG / PNG 底图、原始组件、schema 和示例。
- 方便其他 AI 工具比较新旧边界，避免把海报布局误当成双画面布局。

vendor 目录不是日常开发位置。

## 构建层

`scripts/build.mjs` 生成 `dist/`：

1. 复制原始 kit 到 `dist/koubo/`。
2. 用 `src/` 的在线工具覆盖原始入口页。
3. 把 `config/compositions.json` 发布到 `/koubo/tokens/compositions.json`。
4. 把当前 ChatCut 文档和原始 ZIP 放入公开目录。

这种构建方式让源码、原始 vendor 资产和可部署文件明确分层，又不引入框架依赖。

## 安全与隐私

- 文件 input 只生成 `blob:` Object URL。
- localStorage 只存储版式、配色和文字选项。
- JSON / Markdown 只记录本地文件名侜为交接提示，不嵌入媒体内容或 blob URL。
- 不使用远程字体、第三方分析脚本、远程图标和 CDN 运行时。

## 扩展边界

可以在不破坏当前架构的情况下增加：

- 新的具名横竖版布局。
- 版本化的新配色 token。
- 字幕气口辅助、中心点选择和密集 UI 裁切预设。
- 端侧视频帧选择和多时间点预览。
- 不上传素材的本地项目包导出。

引入账号、后端、云存储、协作或素材市场属于产品边界变更，必须先新建 ADR。
