# AGENTS.md

这是「口播画布」的独立仓库。所有 AI 编程工具在修改前都必须完整读取本文件。

## 开始任务前

1. 读取 `README.md`。
2. 读取 `docs/product-spec.md` 和 `docs/architecture.md`。
3. 涉及 ChatCut / JSX / 剪辑规则时，读取 `docs/chatcut-integration.md`。
4. 涉及上线时，读取 `docs/deployment.md`，且只在用户明确要求发布时执行。

## 唯一真相源

- 横竖版双画面坐标：`config/compositions.json`。
- 在线工具 HTML / CSS / JS：`src/`。
- 原始 8 套配色：`vendor/portrait-talk-theme-kit/tokens/themes.json`。
- 原始 9:16 海报布局：`vendor/portrait-talk-theme-kit/tokens/layouts.json`，它不是新双画面版式的数据源。
- 构建产物：`dist/`，永远不手工修改、不提交。

## 不可变约束

- 每个版式都必须包含「录屏画面 1」与「主讲人画面 2」两个素材槽位。
- 录屏是主证据，优先保护当前讲解的 UI、字段、数值、按钮和光标。
- 主讲人必须等比例显示；禁止分别缩放 X/Y 将脸挤瘦或拉宽。
- 正圆人像只使用一次成方策略：正方形 `cover` 框，或显式裁切。不得叠加两次成方。
- 横版 `1920×1080` 与竖版 `1080×1920` 是两个原生变体；不得用整体缩放、拉伸或补黑边假适配。
- 字幕最多一行。横版从 38–40px 起试，竖版从 84px 手机基线起试。
- 字幕不得与人物、关键 UI 或平台底部安全区冲突。
- 所有导入素材只在浏览器本地处理；未经明确产品决策，不添加上传、账号或云端保存。
- 网页预览只是设计源；ChatCut 时间线和实际导出文件才是成片验收真相源。

## 原始配色包

`vendor/portrait-talk-theme-kit/` 和 `vendor/portrait-talk-theme-kit.zip` 是只读供应商资产，通过 `vendor/manifest.sha256.json` 锁定。

- 不直接修改 `sourcePalette`。
- 需要新色板时，在新的版本化 token 文件中派生，不覆写 vendor 原件。
- 若经用户明确同意更换 vendor 版本，同步更新锁文件、CHANGELOG 和 ADR。

## 开发规则

- 保持零运行时依赖；不引入 CDN 字体、远程 JS/CSS、随机数或系统时钟驱动关键画面。
- 最终场景使用固定像素坐标；外层预览可等比例缩放。
- 新增布局必须使用唯一 `layoutId`、`layoutVersion` 和画幅变体。
- 颜色在视频画布中从语义 token 读取，不在布局实例内散落硬编码。
- JSX 动效用 `seconds = frame / fps`，不把 30fps 固定帧号当成所有导出帧率的时间。
- 可见文案必须有业务含义，不用页码、内部版本号或英文模板占位符装饰。

## 修改联动

- 修改布局：更新 `config/compositions.json`、布局选择预览、JSON / SVG / JSX / Markdown 导出及相关文档。
- 修改导出 schema：更新 `schemaVersion`、属性 schema、ChatCut 文档与压力数据。
- 修改公开能力：更新 `README.md`、`docs/product-spec.md` 和 `CHANGELOG.md`。
- 改变架构边界：新增或更新 `docs/decisions/` 中的 ADR。

## 完成前

1. 运行 `npm run check`。
2. 确认未修改 `vendor/` 锁定资产。
3. 若涉及页面行为，至少用本地 HTTP 读取 `/koubo/`、JS、CSS、`compositions.json` 和 ZIP。
4. 若涉及 ChatCut 成片，不得只凭网页预览宣称成片已验证；必须按目标 fps 短导出并抽帧。
5. 只在用户明确要求时提交、推送或发布。
