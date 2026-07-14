# Changelog

## 2.1.1 - 2026-07-13

- 修复：录屏素材上传后不显示——`.screen-placeholder` 的显式 `display:grid` 压过了 `[hidden]` 规则，占位图不退场、真素材被挤出裁切区；全局补 `[hidden]{display:none!important}` 兜底。
- 修复（同根因）：关闭「显示单行字幕」后预览字幕不消失。
- 安全：部署产物改存 `oss://oneclip`（与 ECS 同区）+ 对象级 private ACL + 10 分钟签名 URL 下载，撤下原公开可匿名拉取的产物。
- 安全：nginx 为 `/koubo/` 下发独立 CSP，站点级补 HSTS / X-Frame-Options / Permissions-Policy。

## 2.1.0 - 2026-07-13

- 精简第 04 步：三段文案与两个裁切选项收入默认折叠的「微调」区，默认文案开箱即用，新增一键恢复默认。
- 文案空值自动回退默认值，预览与全部导出不再出现空白字段。
- 新增「交接包一键下载」：零依赖打包 PNG + SVG + JSON + JSX + MD 为单个 ZIP，替换下载区与页头重复的原始配色包入口。
- PNG 导出的人像 cover 裁切焦点与预览 / JSX 对齐（50% 18% 护脸）。
- favicon 改为 `/koubo/favicon.svg`，子目录部署时使用自己的图标。

## 2.0.0 - 2026-07-13

- 从 9:16 口播海报编辑器升级为「录屏画面 1 + 主讲人画面 2」双源口播工具。
- 新增横版 16:9 与竖版 9:16 两套原生画布，共 8 种构图。
- 新增录屏和主讲人图片 / 视频本地预览。
- 新增 PNG、SVG、JSON、ChatCut JSX 与 Markdown 导出。
- 保留并锁定原始 `portrait-talk-theme-kit` 8 套配色。
- 拆分为独立、零运行时依赖仓库，增加多 AI 编程工具交接文档。
