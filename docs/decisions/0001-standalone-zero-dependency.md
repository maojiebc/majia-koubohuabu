# ADR 0001：独立零运行时依赖仓库

- 状态：已接受
- 日期：2026-07-13

## 背景

口播画布最初作为个人站 `/koubo` 子目录实现。后续需要在 Codex、Claude Code、Gemini CLI、Cursor 和 GitHub Copilot 之间切换，如果继续与个人站共库，AI 需要理解无关页面、Astro 站点和基础设施上下文，容易修改错边界。

## 决策

1. 建立独立私有仓库 `majia-koubohuabu`。
2. 继续使用无框架 HTML / CSS / JavaScript，不增加运行时依赖。
3. 将原始 `portrait-talk-theme-kit` 作为锁定 vendor 资产，不与新双画面布局混合编辑。
4. 将 `config/compositions.json` 设为双画面坐标的唯一真相源。
5. 通过简单 Node.js 脚本生成可部署 `dist/`。
6. 所有 AI 工具共享 `AGENTS.md` 主规则，各自入口文件只负责路由。

## 后果

好处：

- 仓库边界清楚，AI 不需要理解完整个人站。
- 本地开发和 CI 快，无依赖安装、供应链和框架升级负担。
- 原始资产和上层工具分离，能持续验证「没有悄悄换色」。
- 导出契约和布局数据容易被不同 AI 工具读取。

代价：

- HTML / CSS / JavaScript 之间的大型重构需要人工维护模块边界。
- 若未来加入账号、云存储或协作，需要新的后端架构 ADR，不应直接在当前脚本上堆叠。
