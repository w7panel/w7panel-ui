#!/bin/bash
# 前端构建脚本

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$(cd "$(dirname "$0")/../../dist" && pwd)"

echo "=== 构建前端 ==="

cd "$BASE_DIR"

# 清理旧资源
rm -rf "$DIST_DIR/kodata/assets"
rm -f "$DIST_DIR/kodata/index.html"

# 构建
npm run build

# 复制
cp -r dist/* "$DIST_DIR/kodata/"

echo "前端构建完成"
