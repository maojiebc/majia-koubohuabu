# ChatCut 双画面口播接入说明

`/koubo` 现在是一个固定为「录屏画面 1 + 主讲人画面 2」的口播构图工具。原始 `portrait-talk-theme-kit` 的 8 套配色仍是包装 token 数据源；新的 `compositions.json` 管理横版和竖版双源坐标。

## 推荐流程

1. 在 `/koubo` 分别导入录屏与主讲人图片 / 视频。浏览器只生成本地预览，不会上传这两个文件。
2. 选择横版 `1920×1080` 或竖版 `1080×1920`，再选择当前画幅下的具名版式。
3. 选择录屏 `contain` / `cover` 与人物正圆 / 圆角矩形 / 透明抠像。
4. 导出场景 JSON 作为规格锁，导出 ChatCut JSX 作为可编辑包装源。
5. 在 ChatCut 内把真实项目素材绑定到 `screenVideo/screenImage` 与 `speakerVideo/speakerImage`。
6. 先完成两路素材的内容删减、音频同步和速度锁定，再放置画中画、字幕和包装。

## 数据源

- 双画面画幅与坐标：[`/koubo/tokens/compositions.json`](/koubo/tokens/compositions.json)
- 原始配色与语义色：[`/koubo/tokens/themes.json`](/koubo/tokens/themes.json)
- 原始 9:16 海报布局：[`/koubo/tokens/layouts.json`](/koubo/tokens/layouts.json)
- 原始完整 ZIP：[`/koubo/portrait-talk-theme-kit.zip`](/koubo/portrait-talk-theme-kit.zip)

## 双素材规则

### 录屏画面 1

- 它是主证据，优先保护当前讲解的标题、字段、数值、按钮和光标。
- `contain` 用于完整 UI；`cover` 必须根据当前讲解任务定向裁切。
- 竖版不得把完整横屏缩小后补黑边，需按全貌、普通页面、密集 UI 分级重构。

### 主讲人画面 2

- 正圆人像必须使用正方形 `cover` 框，或一次显式横向裁切后再加圆形遮罩。
- 禁止保留原横向裁切的同时又把外框强改为正方形，这会导致二次成方和叶片形人脸。
- 导出的 JSX 内置正圆安全：JSX 同时携带原始矩形框与预计算正方形框，运行时把 `speakerShape` 切到 `circle` 会自动换用正方形框，不会得到椭圆。
- 默认只保留一路最清晰的主讲人声音，另一路重复人声静音。

## 包装一致性

- JSX 背景与网页预览、PNG 一致：主题渐变 + 48px 网格纹理（`group-grid` 层）；在 ChatCut 中覆盖 `canvasColor` 属性时退回纯色。
- 观点字号三个出口共用同一规则（竖版超 14 字 52→42，横版超 18 字 29→25）；JSX 内按运行时 `point` 文案长度自适应。

## 字幕与安全区

- 横版字幕从 `38–40px` 起试；竖版从 `84px` 手机基线起试。
- 最多一行。放不下时先重分气口，不用缩小到难读的字号解决。
- 字幕不压人脸、关键 UI 和平台底部操作区。

## 隐私与导出验收

- 逐段扫描二维码、手机号、账号、客户信息和通知弹窗；裁出或跟踪模糊。
- 按最终目标 fps 做 10–20 秒短导出，覆盖一次包装切换与人物 / 录屏同时切换。
- 下载实际 MP4 后读取尺寸、fps 和时长，并在切换前、中、后抽帧；网页预览不是最终导出证据。
