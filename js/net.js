'use strict';
/* ---------- The Ship :: klient multiplayer (relay pozycji graczy) ---------- */

function roomFromUrl() {
  const p = new URLSearchParams(location.search);
  let r = p.get('room');
  if (!r) {
    r = Math.random().toString(36).slice(2, 8);
    const url = new URL(location.href);
    url.searchParams.set('room', r);
    history.replaceState(null, '', url.toString());
  }
  return r.slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, '') || 'main';
}

class Net {
  constructor(game) {
    this.g = game;
    this.ws = null;
    this.id = null;
    this.name = null;
    this.color = null;
    this.room = roomFromUrl();
    this.players = new Map();     // id -> {pos,yaw,pitch,zone,building,name,color,mesh?}
    this.roster = [];
    this.connected = false;
    this.lastSend = 0;
    this.meshCache = new Map();   // color -> Mesh (współdzielone między graczami o tym kolorze)
    this.retryDelay = 1000;
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    let url;
    if (location.protocol === 'file:') { this.disabled = true; return; }
    url = proto + '://' + location.host + '/ws?room=' + encodeURIComponent(this.room);
    try { this.ws = new WebSocket(url); } catch (e) { this.disabled = true; return; }
    const ws = this.ws;

    ws.onopen = () => { this.connected = true; this.retryDelay = 1000; this.updateBadge(); };
    ws.onclose = () => {
      this.connected = false;
      this.players.clear();
      this.updateBadge();
      setTimeout(() => this.connect(), this.retryDelay);
      this.retryDelay = Math.min(15000, this.retryDelay * 1.6);
    };
    ws.onerror = () => { };
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.t === 'hello') {
        this.id = msg.id; this.name = msg.name; this.color = msg.color;
        this.updateBadge();
      } else if (msg.t === 'roster') {
        this.roster = msg.players;
        this.updateBadge();
      } else if (msg.t === 'players') {
        const seen = new Set();
        for (const p of msg.players) {
          if (p.id === this.id) continue;
          seen.add(p.id);
          const cur = this.players.get(p.id) || {};
          cur.pos = p.pos; cur.yaw = p.yaw; cur.pitch = p.pitch;
          cur.zone = p.zone; cur.building = p.building; cur.name = p.name; cur.color = p.color;
          cur.t = performance.now();
          if (!cur.dispPos) cur.dispPos = p.pos.slice();
          this.players.set(p.id, cur);
        }
        for (const id of Array.from(this.players.keys())) if (!seen.has(id)) this.players.delete(id);
      } else if (msg.t === 'chat') {
        if (this.g && msg.id !== this.id) this.g.toast(msg.name + ': ' + msg.text);
      }
    };
  }

  updateBadge() {
    const el = document.getElementById('mpBadge');
    if (!el) return;
    if (!this.connected) { el.textContent = '⚡ offline'; el.classList.remove('on'); return; }
    const n = this.roster.length;
    el.textContent = '👥 ' + n + (n === 1 ? ' osoba' : ' osoby') + ' na pokładzie';
    el.classList.add('on');
  }

  zoneKey() {
    const g = this.g;
    if (g.loc.state === 'landed') return 'planet:' + g.loc.planet;
    if (g.loc.state === 'orbit') return 'orbit:' + g.loc.planet;
    return 'space';
  }

  /* wysyłka stanu lokalnego gracza – kilkanaście razy na sekundę */
  send() {
    if (!this.ws || this.ws.readyState !== 1) return;
    const now = performance.now();
    if (now - this.lastSend < 70) return;
    this.lastSend = now;
    const g = this.g;
    this.ws.send(JSON.stringify({
      t: 'state',
      s: {
        pos: [g.p.pos[0], g.p.pos[1], g.p.pos[2]],
        yaw: g.p.yaw, pitch: g.p.pitch,
        zone: this.zoneKey(),
        building: !!g.buildMode
      }
    }));
  }

  chat(text) {
    if (!this.ws || this.ws.readyState !== 1 || !text) return;
    this.ws.send(JSON.stringify({ t: 'chat', text: text }));
  }

  meshFor(color) {
    let m = this.meshCache.get(color);
    if (!m) {
      m = buildHuman(this.g.gl, { suit: color, skin: 0xd9a077, hair: 0x2a1f18, accent: 0xffffff });
      this.meshCache.set(color, m);
    }
    return m;
  }

  /* rysuje pozostałych graczy będących w tej samej "strefie" co lokalny gracz */
  render(r, game) {
    if (!this.players.size) return;
    const myZone = this.zoneKey();
    const m = game.mats.tmp;
    const dt = Math.min(0.1, game.lastDt || 0.016);
    for (const [id, p] of this.players) {
      if (p.zone !== myZone || !p.pos) continue;
      if (!p.dispPos) p.dispPos = p.pos.slice();
      for (let i = 0; i < 3; i++) p.dispPos[i] = damp(p.dispPos[i], p.pos[i], 10, dt);
      const mesh = this.meshFor(p.color || 0x5fd8ee);
      const bob = Math.sin(game.time * 6 + id.length) * 0.03;
      r.draw(mesh, m4trs(m, p.dispPos[0], p.dispPos[1] + bob, p.dispPos[2], p.yaw + Math.PI, 1));
    }
  }
}
