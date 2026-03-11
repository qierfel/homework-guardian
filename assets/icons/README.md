# PWA 图标说明

## 需要的图标文件

请准备以下尺寸的 PNG 图标，放置在此目录：

1. **icon-192.png** - 192×192 像素
2. **icon-512.png** - 512×512 像素

## 快速生成图标

### 方案1：在线生成
访问 https://www.favicon-generator.org/
上传一张图片（建议至少 512×512），自动生成所需尺寸

### 方案2：使用 Emoji
如果暂时没有设计好的图标，可以用 Emoji 占位：

```bash
# 在 macOS 上使用 ImageMagick 快速生成
convert -size 192x192 -background "#2563eb" -fill white -pointsize 120 -gravity center label:"🎓" icon-192.png
convert -size 512x512 -background "#2563eb" -fill white -pointsize 320 -gravity center label:"🎓" icon-512.png
```

### 方案3：纯色占位
临时创建纯色占位图标：

```bash
# 深蓝色背景
convert -size 192x192 canvas:"#2563eb" icon-192.png
convert -size 512x512 canvas:"#2563eb" icon-512.png
```

## 设计建议

- 使用简洁的图标设计
- 主色调：深蓝色 (#2563eb)
- 图标元素：书本、铅笔、眼睛、盾牌等教育相关
- 确保在小尺寸下清晰可辨
- 圆角矩形或圆形背景效果更好

## 当前状态

⚠️ **图标文件缺失**

在使用 PWA "添加到主屏幕"功能前，请先添加图标文件。

暂时缺失图标不影响 Web App 的正常运行，只是主屏幕图标会显示默认样式。
