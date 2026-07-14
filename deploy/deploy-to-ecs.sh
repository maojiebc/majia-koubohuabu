#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

INSTANCE_ID="${INSTANCE_ID:-i-bp11utfyrhwq52zu28yb}"
REGION_ID="${REGION_ID:-cn-hangzhou}"
OSS_ENDPOINT="${OSS_ENDPOINT:-oss-cn-hangzhou.aliyuncs.com}"
OSS_URI="${OSS_URI:-oss://oneclip/deploy/majia-koubohuabu.tar.gz}"

npm run check

mkdir -p deploy
COPYFILE_DISABLE=1 tar --format ustar -C dist/koubo -czf deploy/majia-koubohuabu.tar.gz .
# 对象级 private ACL：桶是 public-read，产物必须单独收紧，服务器用短时签名 URL 拉取
aliyun oss cp deploy/majia-koubohuabu.tar.gz "$OSS_URI" -f -e "$OSS_ENDPOINT" --acl private
SIGNED_URL="$(aliyun oss sign "$OSS_URI" --timeout 600 -e "$OSS_ENDPOINT" | grep -o 'https://[^[:space:]]*' | head -1)"
if [[ -z "$SIGNED_URL" ]]; then
  echo "failed to presign $OSS_URI" >&2
  exit 1
fi

REMOTE_SCRIPT="$(cat <<REMOTE
#!/usr/bin/env bash
set -euo pipefail

tmp_tar=/tmp/majia-koubohuabu.tar.gz
tmp_dir=/tmp/majia-koubohuabu-release
new_dir=/var/www/personal-site/koubo.new
live_dir=/var/www/personal-site/koubo
previous_dir=/var/www/personal-site/koubo.previous

rm -rf "\$tmp_dir" "\$new_dir"
mkdir -p "\$tmp_dir" "\$new_dir"
curl -fsSL -o "\$tmp_tar" "$SIGNED_URL"
tar -xzf "\$tmp_tar" -C "\$tmp_dir"
find "\$tmp_dir" -name '._*' -type f -delete
cp -a "\$tmp_dir"/. "\$new_dir"/

chown -R www-data:www-data "\$new_dir"
find "\$new_dir" -type d -exec chmod 0755 {} +
find "\$new_dir" -type f -exec chmod 0644 {} +

rm -rf "\$previous_dir"
if [[ -d "\$live_dir" ]]; then
  mv "\$live_dir" "\$previous_dir"
fi
mv "\$new_dir" "\$live_dir"

rm -rf "\$tmp_tar" "\$tmp_dir"
printf 'deployed majia-koubohuabu; previous release kept at %s\n' "\$previous_dir"
REMOTE
)"

INVOKE_JSON="$(aliyun ecs RunCommand \
  --RegionId "$REGION_ID" \
  --Type RunShellScript \
  --InstanceId.1 "$INSTANCE_ID" \
  --CommandContent "$(printf '%s' "$REMOTE_SCRIPT" | base64 | tr -d '\n')" \
  --ContentEncoding Base64 \
  --Timeout 120)"

INVOKE_ID="$(printf '%s' "$INVOKE_JSON" | node -e "let s=''; process.stdin.on('data', d => s += d); process.stdin.on('end', () => console.log(JSON.parse(s).InvokeId));")"
sleep 3

aliyun ecs DescribeInvocationResults --RegionId "$REGION_ID" --InvokeId "$INVOKE_ID" \
  | node -e "let s=''; process.stdin.on('data', d => s += d); process.stdin.on('end', () => { const r = JSON.parse(s).Invocation.InvocationResults.InvocationResult[0]; console.log(r.InvocationStatus + ' exit=' + r.ExitCode); if (r.Output) console.log(Buffer.from(r.Output, 'base64').toString()); if (r.ErrorInfo) console.error(r.ErrorInfo); process.exit(r.ExitCode || 0); });"

VERIFY_DIR="$(mktemp -d)"
trap 'rm -rf "$VERIFY_DIR"' EXIT
for file in index.html dual-studio.css dual-studio.js tokens/compositions.json portrait-talk-theme-kit.zip; do
  mkdir -p "$VERIFY_DIR/$(dirname "$file")"
  curl -fsSL "https://www.majia.pro/koubo/$file" -o "$VERIFY_DIR/$file"
  cmp "dist/koubo/$file" "$VERIFY_DIR/$file"
done

printf 'verified https://www.majia.pro/koubo/\n'
