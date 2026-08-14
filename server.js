'use strict';
/* ---------- The Ship :: serwer (pliki statyczne + lekki multiplayer po WebSocket) ---------- */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8123;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  // nie wychodź poza katalog projektu
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

/* ====================== MULTIPLAYER (relay stanu graczy per pokój) ====================== */
const wss = new WebSocketServer({ server, path: '/ws' });

/** rooms: Map<roomId, Map<clientId, {ws, state}>> */
const rooms = new Map();
/** roomMeta: Map<roomId, {host: id|null, started: bool, skipVotes: Set<id>}> */
const roomMeta = new Map();
let nextId = 1;

const NAMES = ['Nova', 'Orion', 'Vega', 'Lyra', 'Atlas', 'Zephyr', 'Astra', 'Kepler', 'Rigel', 'Sol'];
const COLORS = [0x5fd8ee, 0xffb765, 0x9ff0c8, 0xd88fe0, 0xff8f7a, 0x8fb8ff, 0xffe066, 0x7affc4];

function roomOf(id) {
  if (!rooms.has(id)) rooms.set(id, new Map());
  return rooms.get(id);
}
function metaOf(id) {
  if (!roomMeta.has(id)) roomMeta.set(id, { host: null, started: false, skipVotes: new Set() });
  return roomMeta.get(id);
}

function broadcastLobby(roomId) {
  const room = roomOf(roomId), meta = metaOf(roomId);
  const list = [];
  for (const [id, c] of room) list.push({ id, name: c.name, color: c.color });
  const msg = JSON.stringify({ t: 'roster', players: list, hostId: meta.host, started: meta.started });
  for (const [, c] of room) if (c.ws.readyState === 1) c.ws.send(msg);
}

function broadcastSkipProgress(roomId) {
  const room = roomOf(roomId), meta = metaOf(roomId);
  const total = room.size;
  const count = meta.skipVotes.size;
  const msg = JSON.stringify({ t: 'skip_progress', count, total });
  for (const [, c] of room) if (c.ws.readyState === 1) c.ws.send(msg);
  if (total > 0 && count >= total) {
    meta.skipVotes.clear();
    const now = JSON.stringify({ t: 'skip_now' });
    for (const [, c] of room) if (c.ws.readyState === 1) c.ws.send(now);
  }
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  let roomId = (url.searchParams.get('room') || 'main').slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, '') || 'main';
  const id = 'p' + (nextId++);
  const name = NAMES[Math.floor(Math.random() * NAMES.length)] + '-' + id.slice(1);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const client = { ws, name, color, state: null, last: Date.now() };
  roomOf(roomId).set(id, client);
  const meta = metaOf(roomId);
  if (!meta.host || !roomOf(roomId).has(meta.host)) meta.host = id;

  ws.send(JSON.stringify({ t: 'hello', id, name, color, room: roomId }));
  broadcastLobby(roomId);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (msg.t === 'state') {
      client.state = msg.s;
      client.last = Date.now();
    } else if (msg.t === 'chat' && typeof msg.text === 'string') {
      const out = JSON.stringify({ t: 'chat', id, name: client.name, text: msg.text.slice(0, 140) });
      for (const [, c] of roomOf(roomId)) if (c.ws.readyState === 1) c.ws.send(out);
    } else if (msg.t === 'transit' && (msg.kind === 'takeoff' || msg.kind === 'landing')) {
      const out = JSON.stringify({ t: 'transit', id, kind: msg.kind, zone: msg.zone, pos: msg.pos });
      for (const [pid, c] of roomOf(roomId)) if (pid !== id && c.ws.readyState === 1) c.ws.send(out);
    } else if (msg.t === 'emote' && typeof msg.name === 'string') {
      const out = JSON.stringify({ t: 'emote', id, name: msg.name.slice(0, 24) });
      for (const [pid, c] of roomOf(roomId)) if (pid !== id && c.ws.readyState === 1) c.ws.send(out);
    } else if (msg.t === 'start_game') {
      const m = metaOf(roomId);
      if (m.host !== id) return;                 // tylko host może rozpocząć
      m.started = true;
      m.skipVotes.clear();
      const out = JSON.stringify({ t: 'game_started' });
      for (const [, c] of roomOf(roomId)) if (c.ws.readyState === 1) c.ws.send(out);
      broadcastLobby(roomId);
    } else if (msg.t === 'skip_vote') {
      metaOf(roomId).skipVotes.add(id);
      broadcastSkipProgress(roomId);
    } else if (msg.t === 'skip_unvote') {
      metaOf(roomId).skipVotes.delete(id);
      broadcastSkipProgress(roomId);
    }
  });

  ws.on('close', () => {
    roomOf(roomId).delete(id);
    const m = metaOf(roomId);
    m.skipVotes.delete(id);
    if (m.host === id) {
      const next = roomOf(roomId).keys().next();
      m.host = next.done ? null : next.value;
    }
    if (roomOf(roomId).size === 0) { m.started = false; m.skipVotes.clear(); }
    broadcastLobby(roomId);
    broadcastSkipProgress(roomId);
  });
  ws.on('error', () => { });
});

/* pętla rozgłaszania pozycji graczy w każdym pokoju, kilkanaście razy na sekundę */
setInterval(() => {
  for (const [roomId, room] of rooms) {
    if (room.size === 0) { rooms.delete(roomId); roomMeta.delete(roomId); continue; }
    const players = [];
    for (const [id, c] of room) {
      if (c.state) players.push(Object.assign({ id, name: c.name, color: c.color }, c.state));
    }
    if (!players.length) continue;
    const msg = JSON.stringify({ t: 'players', players });
    for (const [, c] of room) if (c.ws.readyState === 1) c.ws.send(msg);
  }
}, 80);

server.listen(PORT, () => {
  console.log('The Ship listening on port ' + PORT);
});
