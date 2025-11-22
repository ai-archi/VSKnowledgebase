#!/bin/bash
# 验证构建脚本

echo "=== 验证 Webview 构建 ==="
echo ""

# 检查 webview dist 目录
if [ -d "apps/webview/dist" ]; then
  echo "✓ webview/dist 目录存在"
else
  echo "✗ webview/dist 目录不存在"
  exit 1
fi

# 检查关键文件
if [ -f "apps/webview/dist/create-file-dialog.html" ]; then
  echo "✓ create-file-dialog.html 存在"
else
  echo "✗ create-file-dialog.html 不存在"
  exit 1
fi

if [ -f "apps/webview/dist/index.html" ]; then
  echo "✓ index.html 存在"
else
  echo "✗ index.html 不存在"
  exit 1
fi

# 检查 assets 目录
if [ -d "apps/webview/dist/assets" ]; then
  echo "✓ assets 目录存在"
  ASSET_COUNT=$(ls apps/webview/dist/assets/*.js apps/webview/dist/assets/*.css 2>/dev/null | wc -l)
  echo "  找到 $ASSET_COUNT 个资源文件"
else
  echo "✗ assets 目录不存在"
  exit 1
fi

echo ""
echo "=== 构建验证完成 ==="

