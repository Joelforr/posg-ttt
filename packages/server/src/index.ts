import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WebSocketServer } from 'ws';
import express from 'express';

import { RoomManager } from './room-manager.js';
import { handleConnection } from './connection.js';
import { emit } from './logger.js';

const PORT = process.env.PORT || 8080;

const CLIENT_DIST = process.env.CLIENT_DIST ?? 
  path.resolve(
    fileURLToPath(new URL('.', import.meta.url)),
    '..', '..', 'client', 'dist'
  );

const roomManager = new RoomManager();
const app = express();

//health check
app.get('/health', (_req, res) => res.type('text/plain').send('ok'));

app.use(express.static(CLIENT_DIST, {
  index: false, //handle this ourselves with SPA fallback
  maxAge: '1y',
  immutable:true,
  setHeaders: (res, filePath) =>{
    if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
  },
}));

// SPA fallback: only known route shapes get index.html
app.get(['/', /^\/r\/[A-Z0-9]{1,16}$/], (_req, res) => {
  res.set('Cache-Control', 'no-cache').sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// everything else is a real 404
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).set('Cache-Control', 'no-cache').sendFile(path.join(CLIENT_DIST, 'index.html'));
  } else {
    res.status(404).type('text/plain').send('not found');
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({server, path: '/ws'});

wss.on('connection', ws => {
    console.log("New Connection")
    emit({event: 'new_connection'});
    handleConnection(ws, roomManager);
    
    ws.on('close', (code, reason) =>{
      emit({event: 'connection_closed', code: code, reason: reason});
    })
})

server.listen(PORT, () => {
    emit({ event: 'server_start', port: PORT });
    console.log(`Server running on port ${PORT}`);
})

// Best-effort clean shutdown.
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    emit({ event: 'server_shutdown', signal: sig });
    wss.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5_000).unref();
  });
}

