# AI 编程工具交接

## 统一读取顺序

1. `AGENTS.md`
2. `README.md`
3. `docs/product-spec.md`
4. `docs/architecture.md`
5. 任务对应文档

不同 AI 工具的入口文件只做路由，不复制主规则。如果入口文件与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准。

## 快速任务路由

| 任务 | 先读 | 主要修改 |
| --- | --- | --- |
| 新增一个布局 | product-spec + architecture | `config/compositions.json` + JS 导出器 |
| 改 UI | product-spec | `src/index.html` + `src/dual-studio.css` |
| 改导出代码 | chatcut-integration + architecture | `src/dual-studio.js` |
| 改配色系统 | product-spec + ADR | 新建版本化 token，不改 vendor |
| 部署 | deployment | `deploy/deploy-to-ecs.sh` |
| 架构重构 | architecture + decisions | 先写 ADR，再修改代码 |

## 质量上下文

- 双画面坐标校验是静态 P0 门槛。
- 网页对本地媒体的预览不是 ChatCut 导出证据。
- 修改 JSX 时，时间只用秒或归一化帧率；修改画中画时，始终验证脸部比例和正圆。
- 修改竖版时，必须以手机阅读距离判断字幕和 UI，不能只看桌面端大预览。
- 导入素材不上传是当前产品承诺，不得因为方便而静默改变。

## 完成回报模板

```text
结果：完成了什么。
数据源：改了哪个 schema / layoutId / token 版本。
验证：运行了哪些检查，哪些只是网页预览，哪些经过 ChatCut 实际导出。
未完成：仍需要人工选择、实际素材或导出环境验证的内容。
```
