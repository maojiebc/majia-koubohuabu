# 部署说明

## 线上环境

- 地址：`https://www.majia.pro/koubo`（裸域 `majia.pro` 301 保路径跳转到 www）
- ECS 区域：阿里云杭州 `cn-hangzhou`
- ECS 公网 IP：`47.97.243.95`
- 线上目录：`/var/www/personal-site/koubo`
- nginx vhost：`/etc/nginx/sites-enabled/majia-pro.conf`
- HTTPS 证书目录：`/etc/nginx/certs/majia.pro/`

本仓库不保存阿里云 AccessKey、GitHub token、TLS 私钥或其他密钥。

## 前置条件

- 本机已登录并配置 `aliyun` CLI。
- 本机已安装 `tar`、`curl` 和 Node.js 20+。
- 阿里云 OSS 暂存路径可写，ECS RunCommand 可执行。
- nginx 与 TLS 已在服务器上配置完成；日常发布脚本不修改 DNS、nginx 或证书。

## 发布

```bash
npm run check
deploy/deploy-to-ecs.sh
```

可覆盖的环境变量：

```text
INSTANCE_ID
REGION_ID
OSS_ENDPOINT
OSS_URI
```

发布包上传 OSS 时使用对象级 `private` ACL，服务器通过 10 分钟时效的签名 URL 下载；产物不可匿名访问。

## 安全边界

- 发布包仅包含 `dist/koubo/`。
- 远程脚本仅替换 `/var/www/personal-site/koubo`。
- 不替换 `/var/www/personal-site` 根目录。
- 不修改 `t.oneclip.club`、餐饮体检 H5 或其他子域名。
- 不修改 DNS，除非用户另行明确要求。

## 响应头防护（服务器侧）

`/koubo/` 路径由 nginx 下发独立的 `Content-Security-Policy`（default-src 'self'，图片/媒体额外放行 `blob:` 与 `data:`，脚本仅 self，无内联脚本），站点级下发 `Strict-Transport-Security`、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`。片段文件在服务器 `/etc/nginx/snippets/majia-site-headers.conf` 与 `/etc/nginx/snippets/koubo-csp.conf`。工具本身零内联脚本、零第三方运行时、素材只走本地 `blob:`，是 CSP 能收这么紧的前提，改前端时不要引入内联 `<script>`。

## 发布后验证

1. `https://www.majia.pro/koubo/` 返回 200。
2. `dual-studio.css`、`dual-studio.js`、`tokens/compositions.json` 返回 200。
3. 线上文件与 `dist/koubo/` 逐字节一致。
4. 原始 ZIP 线上文件与 vendor 锁定文件一致。
5. 线上 `compositions.json` 返回 2 种画幅、8 种布局。

## 回滚

脚本会在部署前保留上一版到 `/var/www/personal-site/koubo.previous`。需要回滚时，在 ECS 上将当前目录移出，再把 `koubo.previous` 原子替换回 `koubo`，最后检查 nginx 和线上资源。
