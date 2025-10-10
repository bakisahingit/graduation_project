import { WebSocketServer } from 'ws';

// We will use a simple in-memory map to associate session IDs with WebSocket connections.
const clients = new Map();

export const createWebSocketServer = (server) => {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
        // A real implementation would have a more robust way of getting a session ID
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const sessionId = urlParams.get('sessionId');

        if (!sessionId) {
            console.log('Connection attempt without session ID. Closing.');
            ws.close();
            return;
        }

        console.log(`Client connected with session ID: ${sessionId}`);
        clients.set(sessionId, ws);

        ws.on('close', () => {
            console.log(`Client disconnected with session ID: ${sessionId}`);
            clients.delete(sessionId);
        });

        ws.on('error', (error) => {
            console.error(`WebSocket error for session ${sessionId}:`, error);
        });
    });

    console.log('WebSocket server created and attached to HTTP server.');
};

export const notifyClient = (sessionId, data) => {
    const ws = clients.get(sessionId);
    if (ws && ws.readyState === ws.OPEN) {
        console.log(`Notifying client with session ID: ${sessionId}`);
        ws.send(JSON.stringify(data));
    } else {
        console.log(`Could not find or notify client with session ID: ${sessionId}`);
    }
};
