# HTTPS 服务器配置完成

## ✅ 已完成配置

1. **mkcert 已安装**: ✅
2. **SSL 证书已生成**: ✅
   - 证书文件: `192.168.100.107+2.pem`
   - 密钥文件: `192.168.100.107+2-key.pem`
   - 有效期: 至 2028年6月9日
3. **start.sh 已更新为 HTTPS 模式**: ✅

## 🚀 启动服务器

```bash
cd /Users/lirui/homework-guardian
./start.sh
```

## 🌐 访问地址

### 本机访问
```
https://localhost:8000
```

### iPad 访问
```
https://192.168.100.107:8000
```

## 📱 iPad Safari 访问步骤

1. 确保 iPad 和 Mac 连接同一 WiFi
2. 在 Safari 中打开: `https://192.168.100.107:8000`
3. 首次访问会显示"此连接不是私密连接"
4. 点击 **"高级"** → **"继续访问"**
5. 允许摄像头和麦克风权限
6. 开始使用！

## 🔒 证书说明

- 使用 mkcert 生成的本地开发证书
- 仅在局域网内有效
- iPad 首次访问需要手动信任

## ⚠️ 注意事项

1. **端口**: 使用 8000（避免与其他服务冲突）
2. **HTTPS 必须**: iOS Safari 要求 HTTPS 才能访问摄像头
3. **IP 地址**: 证书包含 192.168.100.107，如果 IP 变化需要重新生成证书

## 🔧 重新生成证书（如果 IP 变化）

```bash
cd /Users/lirui/homework-guardian

# 删除旧证书
rm -f *.pem

# 生成新证书（替换为新IP）
mkcert <新IP> localhost 127.0.0.1
```

## 📝 文件清单

```
/Users/lirui/homework-guardian/
├── 192.168.100.107+2.pem          # SSL 证书
├── 192.168.100.107+2-key.pem      # SSL 私钥
├── start.sh                        # HTTPS 启动脚本
├── index.html                      # Web 应用
├── js/                             # JavaScript 模块
├── css/                            # 样式文件
└── HTTPS_SETUP.md                  # 本文件
```

## ✅ 当前服务器状态

**服务器已启动**: https://localhost:8000

可以立即在 iPad 上访问！
