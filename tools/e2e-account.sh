#!/bin/bash
# 账号本地全流程：起 wrangler pages dev + 本地 D1，curl 走完
# 注册→验证→me→推送→拉取→坏键→登出→登录→找回→重设→旧登录态失效。
set -u
cd "$(dirname "$0")/.."
B=http://127.0.0.1:8999
JAR=$(mktemp)
EMAIL="e2e-$RANDOM@test.local"
fail() { echo "✗ $1"; exit 1; }
jqget() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log(eval('o.'+process.argv[1])===undefined?'':eval('o.'+process.argv[1]))})" "$1"; }

hash_pw() { node -e "const c=require('crypto');console.log(c.pbkdf2Sync(process.argv[1],process.argv[2]+'lianxizhi-account-v1',600000,32,'sha256').toString('hex'))" "$1" "$EMAIL"; }

npx wrangler d1 execute lianxizhi --local --file server/schema.sql >/dev/null 2>&1
# D1 绑定读 wrangler.toml（与 d1 execute --local 同一份本地状态）；
# 带 --d1 flag 会另起一份状态库，两边对不上。先清老进程，免得 8999 被占。
pkill -f "wrangler pages dev" 2>/dev/null; sleep 1
npx wrangler pages dev . --port 8999 \
  --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1 >/tmp/wrangler-e2e.log 2>&1 &
WPID=$!
trap 'kill $WPID 2>/dev/null' EXIT
for i in $(seq 1 60); do curl -s -o /dev/null "$B/" && break; sleep 1; done
curl -s -o /dev/null "$B/" || fail "wrangler 没起来（看 /tmp/wrangler-e2e.log）"

PW=$(hash_pw password123)
R=$(curl -s -X POST "$B/api/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}")
CODE=$(echo "$R" | jqget dev_code)
[ -n "$CODE" ] || fail "注册没回 dev_code：$R"

V=$(curl -s -i -X POST "$B/api/auth/verify" -H 'Content-Type: application/json' -c "$JAR" -d "{\"email\":\"$EMAIL\",\"code\":\"$CODE\"}")
echo "$V" | grep -qi 'set-cookie: sumsum_sess' || fail "verify 没发 cookie"
ME=$(curl -s -b "$JAR" "$B/api/auth/me")
echo "$ME" | grep -q "\"email\":\"$EMAIL\"" || fail "me 不对：$ME"

TS=1700000000000
P=$(curl -s -b "$JAR" -X POST "$B/api/data/push" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"key\":\"sumsum:shizi:v1\",\"value\":\"{\\\"week\\\":3}\",\"updated_at\":$TS},{\"key\":\"evil:key\",\"value\":\"x\",\"updated_at\":$TS}]}")
echo "$P" | grep -q '"applied":1,"skipped":1' || fail "push 计数不对：$P"
D=$(curl -s -b "$JAR" "$B/api/data")
echo "$D" | grep -q 'sumsum:shizi:v1' || fail "pull 拉不到：$D"

curl -s -b "$JAR" -X POST "$B/api/auth/logout" -c "$JAR" >/dev/null
curl -s -b "$JAR" "$B/api/auth/me" | grep -q '"ok":false' || fail "logout 后 me 应 401"

L=$(curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -c "$JAR" -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}")
echo "$L" | grep -q '"ok":true' || fail "登录失败：$L"

sleep 62  # 注册那封邮件占了 60 秒限流窗，等它过去再走找回（生产同样限流）
F=$(curl -s -X POST "$B/api/auth/forgot" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}")
TOKEN=$(echo "$F" | jqget dev_token)
[ -n "$TOKEN" ] || fail "forgot 没回 dev_token：$F"

OLD_JAR=$(mktemp); cp "$JAR" "$OLD_JAR"
PW2=$(hash_pw newpassword9)
RS=$(curl -s -X POST "$B/api/auth/reset" -H 'Content-Type: application/json' -c "$JAR" -d "{\"token\":\"$TOKEN\",\"password\":\"$PW2\"}")
echo "$RS" | grep -q '"ok":true' || fail "重设失败：$RS"
curl -s -b "$OLD_JAR" "$B/api/auth/me" | grep -q '"ok":false' || fail "旧登录态应已失效（pwver）"
L2=$(curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$(hash_pw password123)\"}")
echo "$L2" | grep -q '"ok":false' || fail "旧密码应登不上"

echo "✓ 账号本地全流程通过"
