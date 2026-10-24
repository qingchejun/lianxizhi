#!/bin/sh
# 下载渲染要用的三款开源字体到 fonts/（字体太大，不进仓库）
set -e
cd "$(dirname "$0")"
mkdir -p fonts
[ -f fonts/LXGWWenKai-Medium.ttf ] || curl -sSL -o fonts/LXGWWenKai-Medium.ttf https://github.com/lxgw/LxgwWenKai/releases/latest/download/LXGWWenKai-Medium.ttf
if [ ! -f fonts/ZCOOLKuaiLe.ttf ] || [ ! -f fonts/Fredoka.ttf ]; then
  tmp=$(mktemp -d)
  git clone -q --filter=blob:none --sparse --depth 1 https://github.com/google/fonts.git "$tmp/gf"
  git -C "$tmp/gf" sparse-checkout set ofl/zcoolkuaile ofl/fredoka
  cp "$tmp/gf/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf" fonts/ZCOOLKuaiLe.ttf
  cp "$tmp/gf/ofl/fredoka/"Fredoka*.ttf fonts/Fredoka.ttf
  rm -rf "$tmp"
fi
ls fonts
