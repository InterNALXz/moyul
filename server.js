const WebSocket = require('ws');
const http = require('http');

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket Server is running');
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

// 存储所有连接的客户端
const clients = new Set();
// 为每个客户端生成唯一ID
let clientId = 0;

// 处理 WebSocket 连接
wss.on('connection', (ws) => {
    console.log('新的客户端已连接');
    const currentClientId = ++clientId;
    ws.clientId = currentClientId;  // 为每个连接添加ID
    clients.add(ws);

    // 处理接收到的消息
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('收到消息:', data);

            // 广播消息给所有客户端
            clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'text',
                        content: data.content,
                        sender: `user${currentClientId}`  // 添加发送者标识
                    }));
                }
            });
        } catch (error) {
            console.error('处理消息时出错:', error);
        }
    });

    // 处理连接关闭
    ws.on('close', () => {
        console.log('客户端已断开连接');
        clients.delete(ws);
    });

    // 处理错误
    ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
        clients.delete(ws);
    });
});

// 启动服务器
const PORT = 3446;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 