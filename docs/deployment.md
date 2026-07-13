# 部署说明

## 线上环境

- 地址：`https://www.majia.pro/koubo`
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
OSS_PUBLIC_URL
```

## 安全边界

- 发布包仅包含 `dist/koubo/`。
- 远程脚本仅替换 `/var/www/personal-site/koubo`。
- 不替换 `/var/www/personal-site` 根目录。
- 不修改 `t.oneclip.club`、餐饮体检 H5 或其他子域名。
- 不修改 DNS，除非用户另行明确要求。

## 发布后验证

1. `https://www.majia.pro/koubo/` 返回 200。
2. `dual-studio.css`、`dual-studio.js`、`tokens/compositions.json` 返回 200。
3. 线上文件与 `dist/koubo/` 逐字节一致。
4. 原始 ZIP 线上文件与 vendor 锁定文件一致。
5. 线上 `compositions.json` 返回 2 种画幅、8 种布局。

## 回滚

脚本会在部署前保留上一版到 `/var/www/personal-site/koubo.previous`。需要回滚时，在 ECS 上将当前目录移出，再把 `koubo.previous` 原子替换回 `koubo`，最后检查 nginx 和线上资源。
