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

// 处理 WebSocket 连接
wss.on('connection', (ws) => {
    console.log('新的客户端已连接');
    clients.add(ws);

    // 发送欢迎消息
    ws.send(JSON.stringify({
        type: 'text',
        content: '欢迎连接到服务器！',
        sender: 'system'
    }));

    // 处理接收到的消息
    ws.on('message', (message) => {
        try {
            console.log('收到原始消息:', message.toString());
            const data = JSON.parse(message);
            console.log('解析后的消息数据:', data);

            if (!data.content) {
                console.error('消息内容为空');
                return;
            }

            // 广播消息给所有客户端
            let broadcastCount = 0;
            clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    const messageToSend = {
                        type: 'text',
                        content: data.content,
                        sender: data.sender || 'unknown'  // 使用客户端发送的用户名
                    };
                    console.log('发送消息到客户端:', messageToSend);
                    client.send(JSON.stringify(messageToSend));
                    broadcastCount++;
                }
            });
            console.log(`消息已广播给 ${broadcastCount} 个客户端`);

            // 发送确认消息给发送者
            ws.send(JSON.stringify({
                type: 'text',
                content: '消息已发送',
                sender: 'system'
            }));
        } catch (error) {
            console.error('处理消息时出错:', error);
            // 发送错误消息给客户端
            ws.send(JSON.stringify({
                type: 'text',
                content: '消息处理失败',
                sender: 'system'
            }));
        }
    });

    // 处理连接关闭
    ws.on('close', () => {
        console.log('客户端已断开连接');
        clients.delete(ws);
        console.log(`当前在线客户端数: ${clients.size}`);
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
    console.log('等待客户端连接...');
}); 