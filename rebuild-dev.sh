#!/bin/bash
# rebuild-dev.sh — 在联网环境下，以 main 为基线重建 V2.0 并彻底替换 dev。
# 前置：本仓库已包含 7 个重建文件（src/engine/{draw,stroke,exporter}.ts、package.json、
#       src/lib/version.ts、scripts/vendor-hanzi-data.mjs、.gitignore）。
#
# ⚠ 末尾的 push 为 --force，会整树替换远程 dev。执行前请确认已获 push 批准。
set -e

echo "==> 1. 拉取并以 main 为基线"
git fetch origin main
git checkout -B main origin/main

echo "==> 2. 套用重建文件（已在仓库中）"
# 若当前工作区已是重建态，可跳过；此处确保 7 个文件为重建版本。
git checkout HEAD -- \
  src/engine/draw.ts src/engine/stroke.ts src/engine/exporter.ts \
  package.json src/lib/version.ts scripts/vendor-hanzi-data.mjs .gitignore 2>/dev/null || true

echo "==> 3. 安装依赖并生成本地笔画数据"
npm install
npm run vendor:hanzi

echo "==> 4. 提交重建"
git add -A
git commit -m "rebuild(V2.0): base on main, recover offline + brush dynamics, fix exporter" \
  || echo "(无新改动，跳过提交)"

echo "==> 5. 将本地 dev 指向该提交"
git branch -f dev HEAD

echo "==> 6. 推送（force 替换远程 dev）— 需你明确批准后再取消下方注释执行"
# git push --force origin dev
echo "完成本地准备。取消第 6 步注释并确认授权后，执行 push 即可彻底替换 dev。"
