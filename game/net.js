'use strict';
/* ---------- The Ship :: klient multiplayer (relay pozycji graczy) ---------- */

function roomFromUrl() {
  const p = new URLSearchParams(location.search);
  let r = p.get('room');
  window.__joinedViaLink = !!r;
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
    this.transits = [];           // aktywne odloty/lądowania innych graczy
    this.shuttleMesh = null;
    this.emotes = new Map();      // id -> {name, t}
    this.hostId = null;
    this.started = false;
    this.skipCount = 0;
    this.skipTotal = 0;
    this.onLobby = null;          // wywoływane przy każdej zmianie rosteru/hosta/started
    this.onGameStarted = null;    // wywoływane, gdy host uruchomi grę (u wszystkich)
    this.onSkipProgress = null;   // wywoływane przy zmianie liczby głosów na pominięcie
    this.onSkipNow = null;        // wywoływane, gdy WSZYSCY zagłosują za pominięciem
    this.manualClose = false;     // ustawiane przy świadomej zmianie pokoju, żeby nie próbować reconnectu do starego
  }

  connect() {
    if (this.ws) { this.manualClose = true; try { this.ws.close(); } catch (e) { } }
    this.manualClose = false;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    let url;
    if (location.protocol === 'file:') { this.disabled = true; return; }
    url = proto + '://' + location.host + '/ws?room=' + encodeURIComponent(this.room);
    try { this.ws = new WebSocket(url); } catch (e) { this.disabled = true; return; }
    const ws = this.ws;

    ws.onopen = () => { this.connected = true; this.retryDelay = 1000; this.updateBadge(); };
    ws.onclose = () => {
      if (ws !== this.ws) return;                 // to zamknięcie dotyczy starego, porzuconego socketu
      this.connected = false;
      this.players.clear();
      this.updateBadge();
      if (this.manualClose) return;
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
        this.hostId = msg.hostId;
        this.started = !!msg.started;
        this.skipTotal = msg.players.length;
        this.updateBadge();
        if (this.onLobby) this.onLobby();
      } else if (msg.t === 'game_started') {
        this.started = true;
        if (this.onGameStarted) this.onGameStarted();
      } else if (msg.t === 'skip_progress') {
        this.skipCount = msg.count; this.skipTotal = msg.total;
        if (this.onSkipProgress) this.onSkipProgress(msg.count, msg.total);
      } else if (msg.t === 'skip_now') {
        this.skipCount = 0;
        if (this.onSkipNow) this.onSkipNow();
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
      } else if (msg.t === 'transit') {
        this.transits.push({ kind: msg.kind, zone: msg.zone, pos: msg.pos, t0: performance.now() });
        if (this.g && msg.zone === this.zoneKey()) {
          this.g.toast((msg.kind === 'takeoff' ? '🚀 Czyjś statek startuje w pobliżu.' : '🚀 Czyjś statek schodzi do lądowania.'));
          this.g.audio.noiseBurst(1.8, 260, 90, 0.10, 'lowpass');
        }
      } else if (msg.t === 'emote') {
        this.emotes.set(msg.id, { name: msg.name, t: performance.now() });
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

  /* rozgłasza start/lądowanie do innych graczy w tym samym pokoju */
  sendTransit(kind) {
    if (!this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ t: 'transit', kind: kind, zone: this.zoneKey(), pos: this.g.p.pos.slice() }));
  }

  sendEmote(name) {
    if (!this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ t: 'emote', name: name }));
  }

  isHost() { return this.hostId !== null && this.hostId === this.id; }

  /* host uruchamia grę dla wszystkich w lobby */
  requestStart() {
    if (!this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ t: 'start_game' }));
  }

  voteSkip() {
    if (!this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ t: 'skip_vote' }));
  }
  unvoteSkip() {
    if (!this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({ t: 'skip_unvote' }));
  }

  /* zmienia pokój (dołączenie po kodzie / stworzenie nowego) bez przeładowania strony */
  setRoom(code) {
    const clean = (code || '').trim().slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!clean) return false;
    this.room = clean;
    this.players.clear();
    this.transits = [];
    this.emotes.clear();
    this.hostId = null; this.started = false; this.roster = [];
    const url = new URL(location.href);
    url.searchParams.set('room', clean);
    history.replaceState(null, '', url.toString());
    this.connect();
    return true;
  }

  meshFor(color) {
    let m = this.meshCache.get(color);
    if (!m) {
      m = buildHuman(this.g.gl, { suit: color, skin: 0xd9a077, hair: 0x2a1f18, accent: 0xffffff });
      this.meshCache.set(color, m);
    }
    return m;
  }

  buildShuttle(gl) {
    const mb = new MeshBuilder();
    mb.cylinder(0, 0, 0, 0.5, 1.6, 10, TILE.PANEL, col(0xd8dce2), { rTop: 0.18 });
    mb.cylinder(0, -0.35, 0, 0.42, 0.35, 10, TILE.RIDGE, col(0x5b636d), { rTop: 0.5 });
    mb.cylinder(0, -0.6, 0, 0.22, 0.28, 8, TILE.LIGHT, col(0xffb060), { rTop: 0.05, emis: 1 });
    return new Mesh(gl, mb);
  }

  emoteIcons() {
    return { wave: '👋', sit: '🧘', dance: '🕺', heart: '❤️' };
  }

  /* rysuje pozostałych graczy będących w tej samej "strefie" co lokalny gracz */
  render(r, game) {
    if (this.players.size) {
      const myZone = this.zoneKey();
      const m = game.mats.tmp;
      const dt = Math.min(0.1, game.lastDt || 0.016);
      for (const [id, p] of this.players) {
        if (p.zone !== myZone || !p.pos) continue;
        if (!p.dispPos) p.dispPos = p.pos.slice();
        for (let i = 0; i < 3; i++) p.dispPos[i] = damp(p.dispPos[i], p.pos[i], 10, dt);
        const mesh = this.meshFor(p.color || 0x5fd8ee);
        const emote = this.emotes.get(id);
        const sit = emote && emote.name === 'sit' && performance.now() - emote.t < 3000;
        const bob = sit ? -0.35 : Math.sin(game.time * 6 + id.length) * 0.03;
        r.draw(mesh, m4trs(m, p.dispPos[0], p.dispPos[1] + bob, p.dispPos[2], p.yaw + Math.PI, 1));
      }
    }
    this.renderEmoteLabels(game);
  }

  renderEmoteLabels(game) {
    const el = document.getElementById('emoteLayer');
    if (!el) return;
    const myZone = this.zoneKey();
    const now = performance.now();
    let html = '';
    for (const [id, e] of this.emotes) {
      if (now - e.t > 1800) continue;
      const p = this.players.get(id);
      if (!p || p.zone !== myZone || !p.dispPos) continue;
      const wp = [p.dispPos[0], p.dispPos[1] + 2.35, p.dispPos[2]];
      const sp = game.r.project(wp);
      if (!sp) continue;
      const icon = this.emoteIcons()[e.name] || '❔';
      const fade = 1 - clamp((now - e.t) / 1800, 0, 1);
      html += '<div class="elabel" style="left:' + sp[0] + 'px;top:' + sp[1] + 'px;opacity:' + fade + '">' + icon + '</div>';
    }
    el.innerHTML = html;
  }

  /* rysuje symboliczny wahadłowiec innych graczy odlatujących/lądujących w tej samej strefie */
  renderTransits(r, game) {
    if (!this.transits.length) return;
    if (!this.shuttleMesh) this.shuttleMesh = this.buildShuttle(game.gl);
    const myZone = this.zoneKey();
    const m = game.mats.tmp;
    const now = performance.now();
    for (let i = this.transits.length - 1; i >= 0; i--) {
      const tr = this.transits[i];
      const age = (now - tr.t0) / 1000;
      if (age > 6.5) { this.transits.splice(i, 1); continue; }
      if (tr.zone !== myZone) continue;
      const e = clamp(age / 5.5, 0, 1);
      const rise = tr.kind === 'takeoff' ? e * e * 90 : (1 - e) * 90;
      const y = tr.pos[1] + rise + (tr.kind === 'landing' ? 40 : 0);
      r.draw(this.shuttleMesh, m4trs(m, tr.pos[0], y, tr.pos[2], age * 1.4, 1.6), { emisMul: 1.3 });
    }
  }
}
