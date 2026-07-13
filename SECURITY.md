# Security

## 素材隐私

当前线上工具的图片和视频只在浏览器本地处理，不上传、不写入 localStorage，导出 JSON 也不嵌入 blob URL 或媒体内容。

## 密钥

不要提交：

- GitHub token
- 阿里云 AccessKey
- SSH 私钥
- TLS 私钥
- `.env` 和本机凭证配置

## 问题报告

这是私有仓库。发现素材上传、路径穿越、密钥暴露或第三方运行时注入时，立即停止发布，在私有 GitHub Issue 中记录影响范围和处理进展。
