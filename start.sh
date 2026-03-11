#!/bin/bash
IP=$(ifconfig en0 2>/dev/null | grep 'inet ' | awk '{print $2}')
if [ -z "$IP" ]; then
    IP=$(ifconfig en1 2>/dev/null | grep 'inet ' | awk '{print $2}')
fi
if [ -z "$IP" ]; then
    IP="localhost"
fi
echo "✅ HTTPS 服务器启动中..."
echo "iPad 访问地址: https://$IP:8001"
echo "按 Ctrl+C 停止"

python3 << 'EOF'
import http.server, ssl, os

os.chdir('/Users/lirui/homework-guardian')

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"{self.address_string()} - {args[0]}")

server = http.server.HTTPServer(('0.0.0.0', 8001), Handler)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain('192.168.100.107+2.pem', '192.168.100.107+2-key.pem')
server.socket = ctx.wrap_socket(server.socket, server_side=True)
print("服务器已启动")
server.serve_forever()
EOF
