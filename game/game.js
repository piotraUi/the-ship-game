'use strict';
/* ---------- The Ship :: gra ---------- */

const SAVE_KEY = 'theship.save.v1';

class Game {
  constructor() {
    this.canvas = document.getElementById('glcanvas');
    this.r = new Renderer(this.canvas);
    this.gl = this.r.gl;
    this.audio = new Audio();

    this.ship = new Ship(this.gl);
    this.space = new Space(this.gl);
    this.builder = new Builder(this.gl, this.ship);
    this.sampleMesh = buildSampleMesh(this.gl, col(0x9ff0ff));
    this.terrain = null;
    this.skyDome = null;

    // intro i fabuła
    this.film = new IntroFilm(this.gl, this);
    this.story = new Story(this);
    this.storyDone = false;
    const fb = new MeshBuilder();
    fb.blob(0, 0, 0, 1, 0.45, 7, TILE.LIGHT, col(0xffb04a), { seg: 6, rings: 3, emis: 1, stretch: 1.5 });
    this.fireMesh = new Mesh(this.gl, fb);
    const nb = new MeshBuilder();
    nb.box(-0.16, 0, -0.01, 0.16, 0.22, 0.01, TILE.LIGHT, col(0xfff4d0), { emis: 0.8 });
    nb.box(-0.17, -0.02, -0.025, 0.17, 0.02, 0.025, TILE.PANEL, col(0x4a5058), { uvScale: 1 });
    this.noteMesh = new Mesh(this.gl, nb);
    const sb = new MeshBuilder();
    sb.blob(0, 0, 0, 1, 0.5, 91, TILE.PLAIN, col(0xd8d0c4), { seg: 7, rings: 4 });
    this.smokeMesh = new Mesh(this.gl, sb);

    // start/lądowanie – prawdziwy lot statku zamiast płaskiego przyciemnienia
    this.transit = null;

    // multiplayer (relay pozycji przez WebSocket, jeśli serwer je obsługuje)
    this.net = new Net(this);
    this.net.connect();
    this.lastDt = 0.016;

    // stan podróży
    this.loc = { state: 'space', planet: null };
    this.warp = null;
    this.transition = null;

    // gracz
    this.p = {
      pos: [-10, 0, -8], vel: [0, 0, 0],
      yaw: Math.PI / 2, pitch: 0,
      onGround: true, zerog: false,
      bob: 0, stepPhase: 0, run: false
    };
    this.eyeH = 1.62;
    this.fov = 1.22;
    this.headlamp = 0;
    this.shake = 0;

    // postęp
    this.res = { crystal: 0, mineral: 0, organic: 0 };
    this.mood = 60;
    this.visited = {};
    this.collected = {};
    this.log = [];

    this.keys = {};
    this.paused = true;
    this.started = false;
    this.buildMode = false;
    this.time = 0;
    this.lastToast = 0;

    this.mats = { model: m4identity(m4()), tmp: m4() };
    this.ui = {
      loc: document.getElementById('loc'),
      sub: document.getElementById('sub'),
      stats: document.getElementById('stats'),
      prompt: document.getElementById('prompt'),
      toasts: document.getElementById('toasts'),
      nav: document.getElementById('nav'),
      navBody: document.getElementById('navBody'),
      menu: document.getElementById('menu'),
      start: document.getElementById('start'),
      fade: document.getElementById('fade'),
      palette: document.getElementById('palette'),
      hint: document.getElementById('hint'),
      cross: document.getElementById('crosshair')
    };

    this.buildPalette();
    this.bindInput();
    this.bindLobby();
    this.touch = new TouchInput(this);
    this.load();
    this.applyLocation(true);
    this.updateHud();
  }

  /* ======================= LOBBY ======================= */
  bindLobby() {
    const lobby = document.getElementById('lobby');
    const choice = document.getElementById('lobbyChoice');
    const waiting = document.getElementById('lobbyWaiting');
    const joinBox = document.getElementById('lobbyJoinBox');
    const codeInput = document.getElementById('lobbyCodeInput');
    const codeEl = document.getElementById('lobbyCode');
    const playersEl = document.getElementById('lobbyPlayers');
    const startBtn = document.getElementById('lobbyStartBtn');
    const waitMsg = document.getElementById('lobbyWaitMsg');

    const showWaiting = () => {
      choice.style.display = 'none';
      waiting.style.display = '';
      codeEl.textContent = this.net.room.toUpperCase();
      renderPlayers();
    };

    const renderPlayers = () => {
      const roster = this.net.roster.length ? this.net.roster :
        (this.net.id ? [{ id: this.net.id, name: this.net.name || 'Ty', color: this.net.color || 0x5fd8ee }] : []);
      playersEl.innerHTML = roster.map((p) => {
        const c = 'rgb(' + ((p.color >> 16) & 255) + ',' + ((p.color >> 8) & 255) + ',' + (p.color & 255) + ')';
        const isHost = p.id === this.net.hostId;
        const isMe = p.id === this.net.id;
        return '<div class="plrow"><span class="dot" style="background:' + c + '"></span><span class="nm">' +
          (p.name || '?') + (isMe ? ' (Ty)' : '') + '</span>' + (isHost ? '<span class="host">HOST</span>' : '') + '</div>';
      }).join('') || '<div class="plrow"><span class="nm">Łączenie…</span></div>';
      const iAmHost = this.net.isHost();
      startBtn.style.display = iAmHost ? '' : 'none';
      waitMsg.style.display = iAmHost ? 'none' : '';
    };

    document.getElementById('lobbyCreateBtn').addEventListener('click', () => { this.audio.ui(); showWaiting(); });
    document.getElementById('lobbyJoinBtn').addEventListener('click', () => {
      joinBox.style.display = joinBox.style.display === 'none' ? '' : 'none';
      codeInput.focus();
    });
    document.getElementById('lobbyJoinConfirmBtn').addEventListener('click', () => {
      const code = codeInput.value;
      if (!code.trim()) return;
      if (this.net.setRoom(code)) { showWaiting(); this.toast('Dołączanie do lobby „' + code.trim().toUpperCase() + '"…'); }
    });
    codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('lobbyJoinConfirmBtn').click(); });
    document.getElementById('lobbySoloBtn').addEventListener('click', () => {
      lobby.classList.remove('show');
      this.ui.start.classList.add('show');
    });
    document.getElementById('lobbyBackBtn').addEventListener('click', () => {
      waiting.style.display = 'none';
      choice.style.display = '';
    });
    document.getElementById('lobbyCopyBtn').addEventListener('click', () => {
      if (navigator.clipboard) navigator.clipboard.writeText(this.net.room.toUpperCase()).then(() => this.toast('Kod skopiowany'));
    });
    document.getElementById('lobbyCopyLinkBtn').addEventListener('click', () => {
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(() => this.toast('Link skopiowany'));
    });
    startBtn.addEventListener('click', () => { this.audio.ui(); this.net.requestStart(); });

    this.net.onLobby = () => {
      if (waiting.style.display !== 'none') renderPlayers();
      if (this.net.started && !this.started) this.enterGameFromLobby();
    };
    this.net.onGameStarted = () => this.enterGameFromLobby();

    this.net.onSkipProgress = (count, total) => {
      const b = document.getElementById('skipBtn');
      if (!b) return;
      if (this.skipVoted) b.textContent = 'Czekam na innych… (' + count + '/' + total + ')';
      else if (total > 1) b.textContent = 'Pomiń [Esc] (' + count + '/' + total + ')';
    };
    this.net.onSkipNow = () => {
      this.skipVoted = false;
      if (this.film.active) this.film.finish();
      else if (this.story.cine) this.story.endCine();
    };

    if (window.__joinedViaLink) showWaiting();
  }

  enterGameFromLobby() {
    document.getElementById('lobby').classList.remove('show');
    this.begin();
  }

  /* ======================= WEJŚCIE ======================= */
  bindInput() {
    const canvas = this.canvas;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) { return; }
      this.keys[e.code] = true;
      this.onKey(e);
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });

    canvas.addEventListener('mousedown', (e) => {
      if (!this.started || this.paused) return;
      if (this.buildMode) {
        const t = this.builder.target(this.eye(), this.dir());
        if (e.button === 0) {
          if (this.builder.place(t)) { this.audio.place(); this.save(); }
          else this.audio.deny();
        } else if (e.button === 2) {
          if (this.builder.remove(t)) { this.audio.remove(); this.save(); }
          else this.audio.deny();
        }
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      if (!this.buildMode) return;
      e.preventDefault();
      this.builder.sel = (this.builder.sel + (e.deltaY > 0 ? 1 : -1) + BUILD_ITEMS.length) % BUILD_ITEMS.length;
      this.updatePalette();
    }, { passive: false });

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas) return;
      const s = 0.0022;
      this.p.yaw -= e.movementX * s;
      this.p.pitch = clamp(this.p.pitch - e.movementY * s, -1.5, 1.5);
    });

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      if (!locked && this.started && !this.ui.nav.classList.contains('show')) {
        this.pause(true);
      }
    });

    document.getElementById('startBtn').addEventListener('click', () => this.begin());
    document.getElementById('resumeBtn').addEventListener('click', () => this.resume());
    document.getElementById('musicBtn').addEventListener('click', () => {
      const on = this.audio.toggleMusic();
      document.getElementById('musicBtn').textContent = on ? 'Muzyka: WŁ' : 'Muzyka: WYŁ';
    });
    document.getElementById('introBtn').addEventListener('click', () => this.replayIntro());
    document.getElementById('inviteBtn').addEventListener('click', () => {
      const url = location.href;
      if (navigator.share) {
        navigator.share({ title: 'THE SHIP', text: 'Dołącz do mnie na statku!', url: url }).catch(() => { });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => this.toast('Link skopiowany — wyślij go znajomym!'))
          .catch(() => this.toast(url, true));
      } else this.toast(url, true);
    });
    document.getElementById('skipBtn').addEventListener('click', () => this.skipFilm());
    document.getElementById('navClose').addEventListener('click', () => this.closeNav());
    window.addEventListener('resize', () => this.r.resize());
  }

  onKey(e) {
    if (this.film.active || this.story.cine) {
      if (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') this.skipFilm();
      return;
    }
    if (e.code === 'Escape') {
      if (this.ui.nav.classList.contains('show')) { this.closeNav(); return; }
      if (this.buildMode) { this.toggleBuild(); return; }
      if (this.started) this.paused ? this.resume() : this.pause(true);
      return;
    }
    if (!this.started || this.paused) return;

    if (e.code === 'KeyE') this.interact();
    else if (e.code === 'KeyB') this.toggleBuild();
    else if (e.code === 'KeyM') {
      const on = this.audio.toggleMusic();
      this.toast(on ? '♪ Muzyka włączona' : 'Muzyka wyciszona');
    }
    else if (e.code === 'KeyF') {
      this.headlamp = this.headlamp > 0 ? 0 : 0.75;
      this.toast(this.headlamp > 0 ? 'Latarka włączona' : 'Latarka wyłączona');
    }
    else if (e.code === 'KeyH') this.pause(true);
    else if (e.code === 'KeyZ') this.emote('wave');
    else if (e.code === 'KeyX') this.emote('dance');
    else if (e.code === 'KeyV') this.emote('heart');
    else if (this.buildMode) {
      if (e.code === 'KeyR') { this.builder.yaw += Math.PI / 2; }
      else if (e.code === 'KeyC') {
        this.builder.colorIdx = (this.builder.colorIdx + 1) % BUILD_COLORS.length;
        this.updatePalette();
      }
      else if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.slice(5), 10);
        const idx = n === 0 ? 9 : n - 1;
        if (idx < BUILD_ITEMS.length) { this.builder.sel = idx; this.updatePalette(); }
      }
    }
  }

  begin() {
    this.started = true;
    this.ui.start.classList.remove('show');
    this.audio.start();
    if (!this.storyDone) {
      this.paused = true;
      this.film.start();
      return;
    }
    this.resume();
    this.toast('Witaj z powrotem na pokładzie. [H] – pomoc');
  }

  /* koniec filmu → grywalny prolog (albo powrót do gry, gdy to była powtórka) */
  onFilmEnd() {
    if (this.storyDone) {
      this.story.phase = 'free';
      this.story.setObjective('');
      this.toast('Koniec zapisu archiwalnego.');
    } else {
      this.story.begin();
    }
    this.paused = false;
    this.lockPointer();
  }

  skipFilm() {
    if (!this.film.active && !this.story.cine) return;
    if (this.skipVoted) return;
    if (!this.net.connected || this.net.roster.length <= 1) {
      if (this.film.active) this.film.finish();
      else if (this.story.cine) this.story.endCine();
      return;
    }
    this.skipVoted = true;
    this.net.voteSkip();
    const b = document.getElementById('skipBtn');
    b.classList.add('voted');
    b.textContent = 'Czekam na innych… (' + this.net.skipCount + '/' + this.net.skipTotal + ')';
  }

  replayIntro() {
    this.ui.menu.classList.remove('show');
    this.story.phase = 'none';
    this.story.closeDialog();
    this.story.setObjective('');
    this.paused = true;
    this.film.start();
  }

  pause(show) {
    this.paused = true;
    if (show) {
      this.ui.menu.classList.add('show');
      const n = this.net.roster.length;
      document.getElementById('mpInfo').textContent = this.net.connected
        ? ('Na pokładzie razem z tobą: ' + n + (n === 1 ? ' osoba' : ' osoby') + '. Udostępnij link, żeby dołączyli znajomi.')
        : 'Multiplayer offline — spróbuję połączyć ponownie.';
    }
    if (document.pointerLockElement) document.exitPointerLock();
  }

  resume() {
    if (this.touch && this.touch.mobile && (!this.touch.fsDone || isPortrait())) return;
    this.ui.menu.classList.remove('show');
    this.paused = false;
    this.lockPointer();
  }

  /* na dotyku nie ma kursora do blokowania — i przeglądarka i tak potrafi odrzucić blokadę */
  lockPointer() {
    if (this.touch && this.touch.mobile) return;
    try {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => { });
    } catch (e) { /* nieistotne */ }
  }

  /* ======================= UI ======================= */
  toast(msg, long) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    this.ui.toasts.appendChild(el);
    setTimeout(() => { el.classList.add('out'); }, long ? 5200 : 3000);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, (long ? 5200 : 3000) + 700);
  }

  buildPalette() {
    const p = this.ui.palette;
    p.innerHTML = '';
    BUILD_ITEMS.forEach((it, i) => {
      const d = document.createElement('div');
      d.className = 'slot';
      d.innerHTML = '<span class="ic">' + it.icon + '</span><span class="nm">' + it.name + '</span><span class="num">' + ((i + 1) % 10) + '</span>';
      d.addEventListener('click', () => { this.builder.sel = i; this.updatePalette(); });
      p.appendChild(d);
    });
  }

  updatePalette() {
    const slots = this.ui.palette.children;
    for (let i = 0; i < slots.length; i++) slots[i].classList.toggle('on', i === this.builder.sel);
    const c = BUILD_COLORS[this.builder.colorIdx];
    this.ui.palette.style.setProperty('--swatch',
      'rgb(' + (c[0] * 255 | 0) + ',' + (c[1] * 255 | 0) + ',' + (c[2] * 255 | 0) + ')');
  }

  updateHud() {
    const planet = this.loc.planet !== null ? PLANETS[this.loc.planet] : null;
    let where = '', sub = '';
    if (this.loc.state === 'landed' && !this.ship.roomAt(this.p.pos[0], this.p.pos[2])) {
      where = planet.name;
      sub = planet.kind;
    } else {
      const room = this.ship.roomAt(this.p.pos[0], this.p.pos[2]);
      if (room) { where = 'THE SHIP · ' + room.name; }
      else { where = 'Przestrzeń kosmiczna'; sub = 'Spacer kosmiczny — [Spacja]/[Ctrl] góra-dół'; }
      if (room) {
        sub = this.loc.state === 'landed' ? ('Wylądowano: ' + planet.name)
          : (this.loc.state === 'orbit' ? ('Orbita: ' + planet.name) : 'Głęboka przestrzeń');
      }
    }
    this.ui.loc.textContent = where;
    this.ui.sub.textContent = sub;
    this.ui.stats.innerHTML =
      '<span>💎 ' + this.res.crystal + '</span>' +
      '<span>⛏ ' + this.res.mineral + '</span>' +
      '<span>🌿 ' + this.res.organic + '</span>' +
      '<span class="mood">☕ ' + Math.round(this.mood) + '%</span>';
  }

  /* ======================= ZAPIS ======================= */
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        build: this.builder.serialize(),
        res: this.res, mood: this.mood,
        loc: this.loc, visited: this.visited, collected: this.collected,
        storyDone: this.storyDone || this.story.phase === 'free'
      }));
    } catch (e) { /* brak miejsca – trudno */ }
  }

  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { d = null; }
    if (!d) return;
    if (d.build) this.builder.load(d.build);
    if (d.storyDone) { this.storyDone = true; this.story.phase = 'free'; }
    if (d.res) this.res = d.res;
    if (typeof d.mood === 'number') this.mood = d.mood;
    if (d.visited) this.visited = d.visited;
    if (d.collected) this.collected = d.collected;
    if (d.loc && d.loc.state !== 'landed') this.loc = d.loc;   // start zawsze na statku
    else if (d.loc && d.loc.planet !== null && d.loc.planet !== undefined) this.loc = { state: 'orbit', planet: d.loc.planet };
  }

  /* buduje teren/niebo danej planety tylko jeśli jeszcze nie jest gotowy dla niej */
  ensureTerrainFor(i) {
    const p = PLANETS[i];
    if (this.terrain && this.terrain.p === p) return;
    if (this.terrain) this.terrain.dispose();
    this.terrain = new Terrain(this.gl, p);
    if (this.skyDome) this.skyDome.dispose();
    this.skyDome = buildSkyDome(this.gl, p);
    const taken = this.collected[p.id] || [];
    this.terrain.samples.forEach((s, idx) => { if (taken.indexOf(idx) >= 0) s.taken = true; });
  }

  /* ======================= LOKACJA ======================= */
  applyLocation(silent) {
    const st = this.loc.state;
    if (st === 'landed') {
      const p = PLANETS[this.loc.planet];
      this.ensureTerrainFor(this.loc.planet);
      this.visited[p.id] = true;
      this.audio.setAmbience('planet');
      // skaner wykrywa obozowisko załogi
      if (this.terrain.campPos && !silent) {
        const c = this.terrain.campPos;
        const dist = Math.round(Math.hypot(c[0], c[2]));
        setTimeout(() => {
          this.toast('SKANER: sygnatura metalu i ognia — ' + dist + ' m na ' + this.bearing(c[0], c[2]) + '.', true);
        }, 3200);
      }
    } else {
      if (this.terrain) { this.terrain.dispose(); this.terrain = null; }
      this.audio.setAmbience('space');
    }
    this.updateHud();
    this.save();
  }

  openNav() {
    const body = this.ui.navBody;
    body.innerHTML = '';
    const st = this.loc.state;

    const addCard = (title, kind, desc, meta, btnLabel, action, cls) => {
      const c = document.createElement('div');
      c.className = 'card ' + (cls || '');
      c.innerHTML = '<div class="ct">' + title + '</div><div class="ck">' + kind + '</div>' +
        '<div class="cd">' + desc + '</div><div class="cm">' + meta + '</div>';
      const b = document.createElement('button');
      b.textContent = btnLabel;
      b.addEventListener('click', () => { this.audio.ui(); action(); });
      c.appendChild(b);
      body.appendChild(c);
    };

    if (st === 'landed') {
      const p = PLANETS[this.loc.planet];
      addCard('Start z powierzchni', p.name, 'Podnieś statek na orbitę i lecimy dalej.',
        'Status: wylądowano', 'STARTUJ', () => this.takeOff(), 'hot');
    } else if (st === 'orbit') {
      const p = PLANETS[this.loc.planet];
      addCard('Lądowanie', p.name, p.desc,
        'Grawitacja: ' + p.gravity.toFixed(1) + ' m/s² · Surowce: ' + this.resName(p.resource),
        'LĄDUJ', () => this.landOn(this.loc.planet), 'hot');
    }

    PLANETS.forEach((p, i) => {
      if (this.loc.planet === i && st !== 'space') return;
      const vis = this.visited[p.id] ? 'odwiedzona' : 'nieznana';
      addCard(p.name, p.kind, p.desc,
        'Dystans: ' + p.dist + ' · ' + vis + ' · grawitacja ' + p.gravity.toFixed(1),
        'LEĆ', () => this.startWarp(i));
    });

    if (st !== 'space') {
      addCard('Głęboka przestrzeń', 'Pustka', 'Wyłącz silniki i po prostu dryfuj wśród gwiazd.',
        'Idealne na spacer kosmiczny', 'ODLEĆ W PUSTKĘ', () => this.startWarp(null));
    }

    this.ui.nav.classList.add('show');
    this.paused = true;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  closeNav() {
    this.ui.nav.classList.remove('show');
    this.resume();
  }

  /* kierunek świata dla podpowiedzi skanera (+z = północ, +x = wschód) */
  bearing(x, z) {
    const a = Math.atan2(x, z);
    const names = ['północ', 'północny wschód', 'wschód', 'południowy wschód',
      'południe', 'południowy zachód', 'zachód', 'północny zachód'];
    const i = Math.round(a / (Math.PI / 4));
    return names[((i % 8) + 8) % 8];
  }

  resName(r) {
    return r === 'crystal' ? 'kryształy 💎' : (r === 'mineral' ? 'minerały ⛏' : 'organika 🌿');
  }

  startWarp(target) {
    this.closeNav();
    this.audio.warp();
    if (this.loc.state === 'landed') {
      this.takeOff(() => { this.warp = { t: 0, dur: 6.5, target: target, from: this.loc.planet }; });
      return;
    }
    this.warp = { t: 0, dur: 6.5, target: target, from: this.loc.planet };
    this.toast(target === null ? 'Kurs: głęboka przestrzeń. Silniki na pełną moc.'
      : 'Kurs na ' + PLANETS[target].name + '. Silniki na pełną moc.', true);
  }

  finishWarp() {
    const t = this.warp.target;
    this.warp = null;
    if (t === null) { this.loc = { state: 'space', planet: null }; this.toast('Dryfujesz w pustce. Cisza.'); }
    else {
      this.loc = { state: 'orbit', planet: t };
      this.visited[PLANETS[t].id] = true;
      this.toast('Orbita: ' + PLANETS[t].name + '. Idź na mostek i wciśnij LĄDUJ.', true);
    }
    this.applyLocation();
  }

  landOn(i) {
    this.closeNav();
    this.ensureTerrainFor(i);
    this.beginTransit('landing', () => {
      this.loc = { state: 'landed', planet: i };
      this.applyLocation();
      this.toast('Wylądowano na ' + PLANETS[i].name + '. Śluza jest po prawej stronie korytarza.', true);
    });
  }

  takeOff(after) {
    this.closeNav();
    const wasOutside = !this.ship.roomAt(this.p.pos[0], this.p.pos[2]);
    if (wasOutside) {
      this.toast('Wracaj na pokład przed startem!');
      this.audio.deny();
      return;
    }
    this.beginTransit('takeoff', () => {
      const p = this.loc.planet;
      this.loc = { state: 'orbit', planet: p };
      this.applyLocation();
      this.toast('Statek na orbicie.');
      if (after) after();
    });
  }

  /* ======================= START / LĄDOWANIE — kinowy lot statku ======================= */
  beginTransit(kind, stateCb) {
    this.transit = { kind: kind, t: 0, dur: kind === 'takeoff' ? 5.6 : 5.0, stateCb: stateCb };
    this.paused = true;
    if (document.pointerLockElement) document.exitPointerLock();
    this.net.sendTransit(kind);
    if (kind === 'takeoff') { this.audio.warp(); this.audio.noiseBurst(2.4, 200, 60, 0.22, 'lowpass'); }
    else this.audio.land();
  }

  updateTransit(dt) {
    const tr = this.transit;
    tr.t += dt;
    const e = clamp(tr.t / tr.dur, 0, 1);
    this.shake = Math.max(this.shake, (tr.kind === 'takeoff' ? smoothstep(0, 0.3, e) * (1 - smoothstep(0.6, 1, e)) : smoothstep(0.7, 1, e)) * 0.11);
    if (tr.t >= tr.dur * 0.82 && !tr.faded) { tr.faded = true; this.ui.fade.classList.add('on'); }
    if (tr.t >= tr.dur) {
      const cb = tr.stateCb;
      this.transit = null;
      this.shake = 0;
      cb();
      setTimeout(() => {
        this.ui.fade.classList.remove('on');
        this.paused = false;
        if (this.started) this.lockPointer();
      }, 260);
    }
  }

  /* wysokość, o jaką w danej chwili "unosi się" cały kadłub statku podczas kinowego lotu */
  transitLiftY() {
    if (!this.transit) return 0;
    const e = clamp(this.transit.t / this.transit.dur, 0, 1);
    const p = this.transit.kind === 'takeoff' ? smoothstep(0.06, 0.92, e) : 1 - smoothstep(0.1, 0.96, e);
    return p * p * 240;
  }

  transitCamera() {
    const tr = this.transit;
    if (!tr) return null;
    const e = smoothstep(0, 1, clamp(tr.t / tr.dur, 0, 1));
    if (tr.kind === 'takeoff') {
      const pos = [lerp(52, 22, e), lerp(7, 58, e * e), lerp(60, 18, e)];
      const look = [0, lerp(3, 90, e * e), 0];
      return { pos: pos, dir: vnorm([look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]]), fov: 1.02 + e * 0.28 };
    }
    const pos = [50, 14, 50];
    const look = [0, lerp(160, 1.6, e * e * e), 0];
    return { pos: pos, dir: vnorm([look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]]), fov: 1.0 };
  }

  fadeTo(cb) {
    this.ui.fade.classList.add('on');
    this.paused = true;
    setTimeout(() => {
      cb();
      setTimeout(() => {
        this.ui.fade.classList.remove('on');
        this.paused = false;
        if (this.started && !this.ui.nav.classList.contains('show') && !this.ui.menu.classList.contains('show')) {
          this.lockPointer();
        }
      }, 400);
    }, 900);
  }

  /* ======================= INTERAKCJE ======================= */
  eye() {
    return [this.p.pos[0], this.p.pos[1] + this.eyeH + this.p.bob, this.p.pos[2]];
  }
  dir() {
    const cp = Math.cos(this.p.pitch);
    return [Math.cos(this.p.yaw) * cp, Math.sin(this.p.pitch), -Math.sin(this.p.yaw) * cp];
  }

  findTarget() {
    const eye = this.eye(), d = this.dir();
    let best = null, bestScore = -1;
    const consider = (pos, r, obj) => {
      const dx = pos[0] - eye[0], dy = pos[1] - eye[1], dz = pos[2] - eye[2];
      const dist = Math.hypot(dx, dy, dz);
      if (dist > r) return;
      const dot = (dx * d[0] + dy * d[1] + dz * d[2]) / (dist || 1);
      if (dot < 0.45) return;
      const score = dot * 2 - dist / r;
      if (score > bestScore) { bestScore = score; best = obj; }
    };
    for (const it of this.ship.interact) consider(it.pos, it.r, { kind: 'obj', it: it });
    for (const it of this.story.interactables()) consider(it.pos, it.r, { kind: 'obj', it: it });
    for (const d2 of this.ship.doors) {
      consider([d2.pos[0], 1.2, d2.pos[2]], 3.2, { kind: 'door', door: d2 });
    }
    if (this.terrain) {
      for (let i = 0; i < this.terrain.samples.length; i++) {
        const s = this.terrain.samples[i];
        if (s.taken) continue;
        consider(s.pos, 3.0, { kind: 'sample', sample: s, idx: i });
      }
      for (const n of this.terrain.notes) {
        consider([n.pos[0], n.pos[1] + 0.2, n.pos[2]], 3.0, { kind: 'note', note: n });
      }
    }
    return best;
  }

  interact() {
    if (this.story.dialog) { this.story.advanceDialog(); return; }
    const t = this.findTarget();
    if (!t) return;
    if (t.kind === 'note') {
      this.audio.ui();
      t.note.read = true;
      this.toast(t.note.title + ' — „' + t.note.text + '”', true);
      this.mood = Math.min(100, this.mood + 4);
      return;
    }
    if (t.kind === 'obj' && t.it.npc) { this.story.talkTo(t.it.npc); return; }
    if (t.kind === 'obj' && this.story.handle(t.it.id)) return;
    if (t.kind === 'door') {
      const d = t.door;
      d.target = d.target > 0.5 ? 0 : 1;
      d.timer = 0;
      this.audio.door();
      return;
    }
    if (t.kind === 'sample') {
      const p = PLANETS[this.loc.planet];
      t.sample.taken = true;
      this.res[p.resource]++;
      this.mood = Math.min(100, this.mood + 2);
      if (!this.collected[p.id]) this.collected[p.id] = [];
      this.collected[p.id].push(t.idx);
      this.audio.collect();
      this.toast('Zebrano próbkę: ' + this.resName(p.resource));
      this.updateHud();
      this.save();
      return;
    }
    const id = t.it.id;
    const bump = (n, msg) => {
      this.mood = Math.min(100, this.mood + n);
      this.audio.ui();
      this.toast(msg);
      this.updateHud();
      this.save();
    };
    switch (id) {
      case 'nav':
        if (this.story.active) {
          this.audio.deny();
          this.toast('Nie teraz. Najpierw sprawdź, co się dzieje na statku.');
        } else this.openNav();
        break;
      case 'airlock': {
        const hatch = this.ship.doors.find(d => d.outer);
        hatch.target = hatch.target > 0.5 ? 0 : 1;
        hatch.timer = 0;
        this.audio.door();
        this.toast(hatch.target > 0.5
          ? (this.loc.state === 'landed' ? 'Właz otwarty. Miłego spaceru!' : 'Właz otwarty. Uważaj — zero grawitacji.')
          : 'Właz zamknięty.');
        break;
      }
      case 'stove': bump(8, 'Ugotowałeś makaron z sosem. Pachnie cudownie.'); break;
      case 'coffee': bump(6, 'Świeża kawa. Wszystko wydaje się prostsze.'); break;
      case 'fridge': bump(2, 'W lodówce: ser, dziwny owoc z Amethyst i twój jogurt.'); break;
      case 'bed': if (!this.story.onRest()) this.sleep(); break;
      case 'music': {
        const on = this.audio.toggleMusic();
        bump(3, on ? '♪ Muzyka gra po całym statku' : 'Cisza. Też miło.');
        break;
      }
      case 'telescope': {
        const p = PLANETS[Math.floor(Math.random() * PLANETS.length)];
        bump(4, 'Przez teleskop: ' + p.name + ' — ' + p.kind.toLowerCase() + '.');
        break;
      }
      case 'water': bump(5, 'Podlałeś rośliny. Wyglądają na zadowolone.'); break;
      case 'reactor': this.toast('Reaktor: 98% sprawności, temperatura w normie. Mruczy spokojnie.'); this.audio.ui(); break;
      case 'desk': {
        const v = Object.keys(this.visited).length;
        this.toast('Dziennik: planet odwiedzonych ' + v + '/' + PLANETS.length +
          ' · zbudowanych modułów ' + this.builder.count() +
          ' · próbek ' + (this.res.crystal + this.res.mineral + this.res.organic), true);
        this.audio.ui();
        break;
      }
      case 'printer':
      case 'buildzone':
        this.toggleBuild();
        break;
    }
  }

  sleep() {
    this.audio.ui();
    this.fadeTo(() => {
      this.mood = Math.min(100, this.mood + 25);
      this.time += 200;
      this.updateHud();
      this.toast('Przespałeś się jak dziecko. Nowy dzień na pokładzie.');
      this.save();
    });
  }

  toggleBuild() {
    const inside = !!this.ship.roomAt(this.p.pos[0], this.p.pos[2]);
    if (!this.buildMode && !inside) { this.audio.deny(); this.toast('Budować możesz tylko wewnątrz statku.'); return; }
    this.buildMode = !this.buildMode;
    document.body.classList.toggle('building', this.buildMode);
    this.updatePalette();
    this.audio.ui();
    this.toast(this.buildMode
      ? 'Tryb budowania: LPM stawiaj · PPM usuwaj · [R] obrót · [C] kolor · [1-0] wybór'
      : 'Tryb budowania wyłączony', this.buildMode);
  }

  /* proste emotki widoczne dla innych graczy w tej samej strefie */
  emote(name) {
    if (this.buildMode) return;
    this.net.sendEmote(name);
    this.audio.blip(name === 'heart' ? 900 : 500, 0.18, 0.06, 'triangle');
    const label = name === 'wave' ? '👋 machasz' : name === 'dance' ? '🕺 tańczysz' : '❤️';
    this.toast(label);
  }

  /* ======================= FIZYKA ======================= */
  colliders() {
    const list = this.ship.colliders;
    return list;
  }

  groundAt(x, z, feet) {
    const inside = this.ship.roomAt(x, z);
    let g = -Infinity;
    if (inside) g = FLOOR_Y;
    else if (this.loc.state === 'landed' && this.terrain) g = this.terrain.height(x, z);
    // stanie na obiektach
    const r = 0.34;
    const check = (b) => {
      if (x + r < b[0] || x - r > b[3] || z + r < b[2] || z - r > b[5]) return;
      if (b[4] <= feet + 0.55 && b[4] > g) g = b[4];
    };
    for (const b of this.ship.colliders) check(b);
    for (const b of this.builder.colliders()) check(b);
    if (this.terrain) for (const b of this.terrain.colliders) check(b);
    for (const d of this.ship.doors) {
      if (d.open > 0.7) continue;
      const b = this.doorBox(d);
      check(b);
    }
    return g;
  }

  doorBox(d) {
    const t = 0.2, h = d.h;
    if (d.axis === 'x') return [d.pos[0] - d.w / 2, 0, d.pos[2] - t, d.pos[0] + d.w / 2, h, d.pos[2] + t];
    return [d.pos[0] - t, 0, d.pos[2] - d.w / 2, d.pos[0] + t, h, d.pos[2] + d.w / 2];
  }

  resolveHorizontal(feet) {
    const p = this.p, r = 0.34;
    const head = feet + 1.7;
    const push = (b) => {
      if (b[4] <= feet + 0.55) return;              // można wejść na wierzch
      if (b[1] >= head) return;                      // nad głową
      const x = p.pos[0], z = p.pos[2];
      if (x + r <= b[0] || x - r >= b[3] || z + r <= b[2] || z - r >= b[5]) return;
      const dxL = (x + r) - b[0], dxR = b[3] - (x - r);
      const dzL = (z + r) - b[2], dzR = b[5] - (z - r);
      const m = Math.min(dxL, dxR, dzL, dzR);
      if (m === dxL) { p.pos[0] = b[0] - r; if (p.vel[0] > 0) p.vel[0] = 0; }
      else if (m === dxR) { p.pos[0] = b[3] + r; if (p.vel[0] < 0) p.vel[0] = 0; }
      else if (m === dzL) { p.pos[2] = b[2] - r; if (p.vel[2] > 0) p.vel[2] = 0; }
      else { p.pos[2] = b[5] + r; if (p.vel[2] < 0) p.vel[2] = 0; }
    };
    for (const b of this.ship.colliders) push(b);
    for (const b of this.builder.colliders()) push(b);
    if (this.terrain) for (const b of this.terrain.colliders) push(b);
    for (const d of this.ship.doors) {
      if (d.open > 0.7) continue;
      const b = this.doorBox(d);
      // drzwi blokują tylko gdy naprawdę zamknięte
      push([b[0], b[1], b[2], b[3], b[4], b[5]]);
    }
  }

  updatePlayer(dt) {
    const p = this.p, k = this.keys;
    const inside = !!this.ship.roomAt(p.pos[0], p.pos[2]);
    const inSpace = this.loc.state !== 'landed';
    const zerog = !inside && inSpace;
    p.zerog = zerog;

    const fwd = [Math.cos(p.yaw), 0, -Math.sin(p.yaw)];
    const right = [-fwd[2], 0, fwd[0]];
    let ix = 0, iz = 0;
    if (k['KeyW'] || k['ArrowUp']) iz += 1;
    if (k['KeyS'] || k['ArrowDown']) iz -= 1;
    if (k['KeyD'] || k['ArrowRight']) ix += 1;
    if (k['KeyA'] || k['ArrowLeft']) ix -= 1;
    const len = Math.hypot(ix, iz);
    if (len > 0) { ix /= len; iz /= len; }
    p.run = !!(k['ShiftLeft'] || k['ShiftRight']);

    if (zerog) {
      /* --- spacer kosmiczny --- */
      const acc = p.run ? 13 : 6.5;
      const pitchDir = this.dir();
      const useAim = true;
      const f = useAim ? pitchDir : fwd;
      p.vel[0] += (f[0] * iz + right[0] * ix) * acc * dt;
      p.vel[1] += (f[1] * iz) * acc * dt;
      p.vel[2] += (f[2] * iz + right[2] * ix) * acc * dt;
      if (k['Space']) p.vel[1] += acc * dt;
      if (k['ControlLeft'] || k['ControlRight'] || k['KeyC']) p.vel[1] -= acc * dt;
      const drag = Math.pow(0.12, dt);
      p.vel[0] *= drag; p.vel[1] *= drag; p.vel[2] *= drag;
      // delikatna „lina” – nie oddalaj się za bardzo od statku
      const dx = p.pos[0] - 0, dz = p.pos[2] - 0, dy = p.pos[1] - 1.5;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 78) {
        const pull = (dist - 78) * 0.55;
        p.vel[0] -= dx / dist * pull * dt;
        p.vel[1] -= dy / dist * pull * dt;
        p.vel[2] -= dz / dist * pull * dt;
        if (!this.tetherMsg || this.time - this.tetherMsg > 12) {
          this.tetherMsg = this.time;
          this.toast('Lina asekuracyjna napięta — wracasz w stronę statku.');
        }
      }
      p.onGround = false;
      p.bob = damp(p.bob, 0, 6, dt);
    } else {
      /* --- chodzenie --- */
      const grav = inside ? 11 : (this.loc.state === 'landed' ? PLANETS[this.loc.planet].gravity : 11);
      const speed = (p.run ? 7.2 : 4.1) * (inside ? 1 : 1.05);
      const wish = [(fwd[0] * iz + right[0] * ix) * speed, 0, (fwd[2] * iz + right[2] * ix) * speed];
      const ctrl = p.onGround ? 12 : 3.2;
      p.vel[0] = damp(p.vel[0], wish[0], ctrl, dt);
      p.vel[2] = damp(p.vel[2], wish[2], ctrl, dt);
      p.vel[1] -= grav * dt;
      if (k['Space'] && p.onGround) {
        p.vel[1] = Math.sqrt(2 * grav * 1.05);
        p.onGround = false;
      }
      // kołysanie kamery przy chodzeniu
      const spd = Math.hypot(p.vel[0], p.vel[2]);
      if (p.onGround && spd > 0.6) {
        p.stepPhase += dt * spd * 1.65;
        p.bob = Math.sin(p.stepPhase * 2) * 0.035;
        if (p.stepPhase - (p.lastStep || 0) > Math.PI) {
          p.lastStep = p.stepPhase;
          this.audio.step(!inside);
        }
      } else {
        p.bob = damp(p.bob, 0, 8, dt);
      }
    }

    p.pos[0] += p.vel[0] * dt;
    p.pos[1] += p.vel[1] * dt;
    p.pos[2] += p.vel[2] * dt;

    // granice świata
    if (this.loc.state === 'landed') {
      const lim = TERRAIN_HALF - 12;
      let out = false;
      if (p.pos[0] < -lim) { p.pos[0] = -lim; out = true; }
      if (p.pos[0] > lim) { p.pos[0] = lim; out = true; }
      if (p.pos[2] < -lim) { p.pos[2] = -lim; out = true; }
      if (p.pos[2] > lim) { p.pos[2] = lim; out = true; }
      if (out && (!this.edgeMsg || this.time - this.edgeMsg > 10)) {
        this.edgeMsg = this.time;
        this.toast('Dalej nie warto iść. Statek jest w drugą stronę.');
      }
    }

    if (!zerog) {
      this.resolveHorizontal(p.pos[1]);
      const g = this.groundAt(p.pos[0], p.pos[2], p.pos[1]);
      if (isFinite(g)) {
        if (p.pos[1] <= g + 0.02) {
          if (p.vel[1] < -6) this.audio.step(true);
          p.pos[1] = g;
          p.vel[1] = 0;
          p.onGround = true;
        } else if (p.pos[1] - g < 0.6 && p.vel[1] <= 0) {
          p.pos[1] = damp(p.pos[1], g, 18, dt);
          p.onGround = true;
        } else p.onGround = false;
      } else {
        p.onGround = false;
        if (p.pos[1] < -30) { p.pos[1] = 1; p.vel[1] = 0; p.pos[0] = 21; p.pos[2] = 5; }
      }
    } else {
      this.resolveHorizontal(p.pos[1]);
      // sufit/podłoga wewnątrz kadłuba nie dotyczy — w kosmosie tylko kolizje boczne
    }
  }

  updateDoors(dt) {
    for (const d of this.ship.doors) {
      const spd = 1.15;
      if (d.open < d.target) d.open = Math.min(d.target, d.open + spd * dt);
      else if (d.open > d.target) d.open = Math.max(d.target, d.open - spd * dt);
      if (d.target > 0.5 && d.open >= 1) {
        d.timer += dt;
        if (d.timer > 9) { d.target = 0; d.timer = 0; this.audio.door(); }
      }
    }
  }

  /* ======================= PĘTLA ======================= */
  update(dt) {
    this.time += dt;
    const inCine = this.film.active || !!this.story.cine;
    if (inCine && !this._wasCine) {
      this.skipVoted = false;
      const b = document.getElementById('skipBtn');
      if (b) { b.classList.remove('voted'); b.textContent = 'Pomiń [Esc]'; }
      if (this.net.connected) this.net.unvoteSkip();
    }
    this._wasCine = inCine;
    if (this.film.active) { this.film.update(dt); return; }
    this.audio.update(dt);
    if (this.transit) { this.updateTransit(dt); this.net.send(); return; }
    this.story.update(dt);
    if (this.story.cine) return;

    if (this.warp) {
      this.warp.t += dt;
      this.shake = 0.03 * Math.min(1, this.warp.t / 1.5) * (this.warp.t > this.warp.dur - 1 ? 0.3 : 1);
      if (this.warp.t >= this.warp.dur) { this.shake = 0; this.finishWarp(); }
    } else this.shake = damp(this.shake, 0, 4, dt);

    if (!this.paused) {
      this.touch.update(dt);
      this.updatePlayer(dt);
      this.updateDoors(dt);
      this.net.send();
      // automatyczne zbieranie bardzo bliskich próbek
      if (this.terrain) {
        for (let i = 0; i < this.terrain.samples.length; i++) {
          const s = this.terrain.samples[i];
          if (s.taken) continue;
          const d = Math.hypot(s.pos[0] - this.p.pos[0], s.pos[1] - this.p.pos[1] - 1, s.pos[2] - this.p.pos[2]);
          if (d < 1.4) {
            const p = PLANETS[this.loc.planet];
            s.taken = true;
            this.res[p.resource]++;
            if (!this.collected[p.id]) this.collected[p.id] = [];
            this.collected[p.id].push(i);
            this.audio.collect();
            this.toast('Zebrano próbkę: ' + this.resName(p.resource));
            this.updateHud();
            this.save();
          }
        }
      }
      // nastrój powoli opada
      this.mood = Math.max(0, this.mood - dt * 0.12);
    }

    // podpowiedź interakcji
    const t = this.story.dialog ? null : this.findTarget();
    if (this.buildMode) {
      this.ui.prompt.textContent = '';
      this.ui.prompt.classList.remove('show');
    } else if (t) {
      let label;
      if (t.kind === 'door') label = (t.door.target > 0.5 ? 'Zamknij: ' : 'Otwórz: ') + t.door.name;
      else if (t.kind === 'sample') label = 'Zbierz próbkę';
      else if (t.kind === 'note') label = 'Przeczytaj: ' + t.note.title;
      else label = t.it.label;
      this.ui.prompt.innerHTML = '<b>E</b> ' + label;
      this.ui.prompt.classList.add('show');
    } else {
      this.ui.prompt.classList.remove('show');
    }

    if (Math.floor(this.time) % 3 === 0) this.updateHud();
  }

  /* ======================= RYSOWANIE ======================= */
  render() {
    const r = this.r, gl = this.gl;
    if (this.film.active) { this.film.render(r); return; }

    const cam = this.transit ? this.transitCamera() : this.story.cameraOverride();
    const eye = cam ? cam.pos.slice() : this.eye();
    if (this.shake > 0) {
      eye[0] += (Math.random() - 0.5) * this.shake;
      eye[1] += (Math.random() - 0.5) * this.shake;
      eye[2] += (Math.random() - 0.5) * this.shake;
    }
    const dir = cam ? cam.dir : this.dir();
    const landed = this.loc.state === 'landed';
    // podczas kinowego lądowania widzimy powierzchnię planety, zanim stan formalnie się przestawi
    const showGround = landed || (this.transit && this.transit.kind === 'landing');
    const planet = this.loc.planet !== null ? PLANETS[this.loc.planet] : null;
    const outside = !this.ship.roomAt(this.p.pos[0], this.p.pos[2]);
    const liftY = this.transitLiftY();
    const shipModel = liftY ? m4trs(this.mats.tmp2 || (this.mats.tmp2 = m4()), 0, liftY, 0, 0, 1) : this.mats.model;

    let fov = cam ? cam.fov : this.fov;
    if (this.warp) fov += Math.sin(clamp(this.warp.t / this.warp.dur, 0, 1) * Math.PI) * 0.35;
    if (!cam) {
      const spd = Math.hypot(this.p.vel[0], this.p.vel[2]);
      fov += clamp((spd - 5) * 0.012, 0, 0.06);
    }

    const bgCol = showGround && !planet.airless ? planet.fogCol : [0, 0, 0];
    r.clearSky(bgCol);
    r.beginFrame(eye, dir, fov, 0.06, 900);

    /* ---------- NIEBO ---------- */
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);

    if (showGround && !planet.airless) {
      r.setEnv({ ambient: [1, 1, 1], sunCol: [0, 0, 0], lights: [], fogDensity: 0 });
      r.useMain(true);
      r.draw(this.skyDome, this.mats.model);
    } else {
      // gwiazdy i mgławice
      r.setEnv({ ambient: [1, 1, 1], sunCol: [0, 0, 0], lights: [], fogDensity: 0 });
      r.useMain(true);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      r.draw(this.space.nebula, this.mats.model, { alpha: 0.07 });
      gl.disable(gl.BLEND);
      const warpAmt = this.warp ? Math.sin(clamp(this.warp.t / this.warp.dur, 0, 1) * Math.PI) : 0;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      r.drawStars(this.space.starBuf, this.space.starCount, gl.POINTS, [0, 0, 1], 0, 1);
      if (warpAmt > 0.02) {
        const wd = vnorm([dir[0], dir[1], dir[2]]);
        r.drawStars(this.space.starBuf, this.space.starCount, gl.LINES, wd, warpAmt * 260, 0.85);
      }
      gl.disable(gl.BLEND);
    }

    // słońce
    const sunDir = showGround ? planet.sunDir : vnorm([0.55, 0.28, -0.78]);
    r.setEnv({ ambient: [1, 1, 1], sunCol: [0, 0, 0], lights: [], fogDensity: 0 });
    r.useMain(true);
    const sunR = showGround ? (planet.airless ? 9 : 13) : 11;
    r.draw(this.space.sun, m4trs(this.mats.tmp, sunDir[0] * SKY_R * 0.9, sunDir[1] * SKY_R * 0.9, sunDir[2] * SKY_R * 0.9, 0, sunR));

    // planety na niebie
    r.setEnv({
      ambient: [0.1, 0.1, 0.14],
      sunDir: sunDir, sunCol: [1.25, 1.2, 1.1],
      lights: [], fogDensity: 0
    });
    r.useMain(true);
    const FRONT = [0.86, -0.16, 0.28];
    for (let i = 0; i < PLANETS.length; i++) {
      const p = PLANETS[i];
      if (showGround && i === this.loc.planet) continue;  // stoisz na niej / właśnie na nią lądujesz
      let size = p.size * 0.55;
      let d = p.skyDir;
      // wielki widok "przed dziobem" tylko gdy naprawdę stoimy na orbicie i NIE lecimy właśnie dalej
      if (!landed && !this.warp && this.loc.state === 'orbit' && i === this.loc.planet) {
        size = 175;
        d = vnorm(FRONT);
      }
      if (this.warp) {
        const t = clamp(this.warp.t / this.warp.dur, 0, 1);
        if (this.warp.target === i) {
          // cel podróży rośnie z małej kropki na niebie do pełnej orbity przed dziobem
          size = lerp(p.size * 0.55, 175, t * t);
          d = vnorm([lerp(p.skyDir[0], FRONT[0], t), lerp(p.skyDir[1], FRONT[1], t), lerp(p.skyDir[2], FRONT[2], t)]);
        } else if (this.warp.from === i) {
          // planeta, którą opuszczasz – kurczy się z widoku "przed dziobem" i odjeżdża na swoje miejsce na niebie
          const shrink = smoothstep(0, 0.55, t);
          size = lerp(175, p.size * 0.55, shrink);
          d = vnorm([lerp(FRONT[0], p.skyDir[0], shrink), lerp(FRONT[1], p.skyDir[1], shrink), lerp(FRONT[2], p.skyDir[2], shrink)]);
        }
      }
      // w scenie końcowej prologu Verdana Prime jest celem kapsuł
      if (this.story.cine && i === 0) {
        size = 58;
        d = vnorm([0.12, 0.18, 0.97]);
      }
      const dist = SKY_R * 0.85;
      r.draw(this.space.planetMeshes[i],
        m4trs(this.mats.tmp, d[0] * dist, d[1] * dist, d[2] * dist, this.time * 0.01 + i, size));
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    r.clearDepth();

    /* ---------- ŚWIAT ---------- */
    let lights = this.ship.lights.concat(this.builder.lights);
    if (this.terrain) for (const l of this.terrain.lights) lights.push(l);
    lights = this.story.tintLights(lights);

    if (showGround) {
      // teren
      r.setEnv({
        ambient: planet.ambient,
        sunDir: planet.sunDir, sunCol: colScale(planet.sunCol, 0.95),
        fogCol: planet.fogCol, fogDensity: planet.fogDensity,
        headlamp: this.headlamp, lights: lights
      });
      r.useMain(false);
      r.draw(this.terrain.mesh, this.mats.model);
      r.draw(this.terrain.props, this.mats.model);
      if (this.terrain.water) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        r.draw(this.terrain.water, this.mats.model, { alpha: 0.75 });
        gl.disable(gl.BLEND);
      }
      // próbki
      for (const s of this.terrain.samples) {
        if (s.taken) continue;
        const y = s.pos[1] + Math.sin(this.time * 1.6 + s.phase) * 0.14;
        r.draw(this.sampleMesh, m4trs(this.mats.tmp, s.pos[0], y, s.pos[2], this.time * 1.1 + s.phase, 1),
          { emisMul: 1.1 + Math.sin(this.time * 3 + s.phase) * 0.3 });
      }
      // notatki zostawione przez załogę
      for (const n of this.terrain.notes) {
        const y = n.pos[1] + Math.sin(this.time * 1.2 + n.pos[0]) * 0.06;
        r.draw(this.noteMesh, m4trs(this.mats.tmp, n.pos[0], y, n.pos[2], this.time * 0.5, 1),
          { emisMul: n.read ? 0.5 : 1.3 + Math.sin(this.time * 2.4) * 0.3 });
      }
      // ognisko w obozie
      if (this.terrain.fire) {
        const f = this.terrain.fire.pos;
        for (let i = 0; i < 3; i++) {
          const s = 0.32 + Math.sin(this.time * (7 + i * 2.3) + i) * 0.09;
          r.draw(this.fireMesh, m4trs(this.mats.tmp, f[0] + Math.sin(this.time * 4 + i) * 0.06,
            f[1] + i * 0.22, f[2] + Math.cos(this.time * 3.4 + i) * 0.06, this.time * (1 + i), s),
            { emisMul: 1.4 + Math.sin(this.time * 9 + i) * 0.4 });
        }
      }
    }

    // statek
    const shipEnv = showGround ? {
      ambient: [Math.max(0.36, planet.ambient[0]), Math.max(0.36, planet.ambient[1]), Math.max(0.38, planet.ambient[2])],
      sunDir: planet.sunDir, sunCol: colScale(planet.sunCol, 0.55),
      fogCol: planet.fogCol, fogDensity: planet.fogDensity * (outside ? 1 : 0.15),
      headlamp: this.headlamp, lights: lights
    } : {
      ambient: [0.30, 0.31, 0.36],
      sunDir: sunDir, sunCol: [0.55, 0.53, 0.5],
      fogCol: [0, 0, 0], fogDensity: 0,
      headlamp: this.headlamp, lights: lights
    };
    shipEnv.ambient = this.story.tintAmbient(shipEnv.ambient);
    r.setEnv(shipEnv);
    r.useMain(false);
    r.draw(this.ship.mesh, shipModel);
    r.draw(this.builder.mesh, shipModel);
    this.story.renderExtra(r, this);
    this.net.render(r, this);
    this.net.renderTransits(r, this);

    // drzwi (animowane skrzydła)
    for (const d of this.ship.doors) {
      const hw = d.w / 2;
      const off = hw * d.open;
      const ax = d.axis === 'x' ? 1 : 0, az = d.axis === 'x' ? 0 : 1;
      const yaw = d.axis === 'x' ? 0 : -Math.PI / 2;
      for (const s of [-1, 1]) {
        const c = s * (hw / 2 + off);
        r.draw(this.ship.doorPanel,
          m4trs(this.mats.tmp, d.pos[0] + ax * c, 0.02 + liftY, d.pos[2] + az * c, yaw, hw, d.h - 0.04, 1));
      }
    }

    // pulsujący rdzeń reaktora + holo-stół
    const transitBoost = this.transit ? 1 + smoothstep(0, 0.4, clamp(this.transit.t / this.transit.dur, 0, 1)) * 1.6 : 1;
    const pulse = (0.75 + Math.sin(this.time * 1.6) * 0.25) * transitBoost;
    r.draw(this.ship.glowBox, m4trs(this.mats.tmp, -31, 0.35 + liftY, 0, this.time * 0.35, 2.6, 2.55, 2.6),
      { emisMul: pulse * 0.9, alpha: 1 });
    const holoS = 1.1 + Math.sin(this.time * 0.8) * 0.05;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    r.draw(this.space.planetMeshes[this.loc.planet === null ? 0 : this.loc.planet],
      m4trs(this.mats.tmp, 30, 1.28 + liftY, 0, this.time * 0.25, 0.22 * holoS), { alpha: 0.5, emisMul: 1 });
    gl.disable(gl.BLEND);

    // silniki i pył podczas startu/lądowania
    if (this.transit) {
      const e = clamp(this.transit.t / this.transit.dur, 0, 1);
      const flame = this.transit.kind === 'takeoff' ? smoothstep(0.02, 0.35, e) * (1 - smoothstep(0.75, 1, e)) : smoothstep(0.75, 0.98, e);
      if (flame > 0.02) {
        for (const gz of [-5.5, 5.5]) {
          r.draw(this.fireMesh, m4trs(this.mats.tmp, -46.5, 1.8 + liftY, gz, this.time * 6, 0.9 + flame * 1.4),
            { emisMul: 1.2 + flame * 1.8 });
        }
      }
      const dust = this.transit.kind === 'takeoff' ? (1 - smoothstep(0, 0.35, e)) : smoothstep(0.8, 1, e);
      if (dust > 0.03 && showGround) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2 + this.time;
          const rr = 8 + dust * 22 + i * 2;
          r.draw(this.smokeMesh, m4trs(this.mats.tmp, Math.cos(a) * rr, 0.3 + dust * 1.5, Math.sin(a) * rr, a, 3 + dust * 9),
            { alpha: dust * 0.5 });
        }
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
    }

    // duch budowanego elementu
    if (this.buildMode) {
      const t = this.builder.target(this.eye(), dir);
      if (t) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        r.draw(this.builder.ghosts[this.builder.sel],
          m4trs(this.mats.tmp, t.x + 0.5, t.y, t.z + 0.5, this.builder.yaw, 1),
          { alpha: 0.45 + Math.sin(this.time * 4) * 0.12, emisMul: 1.6 });
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
    }

    // szyby
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    r.draw(this.ship.glass, shipModel, { alpha: 0.07 });
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  loop(ts) {
    const now = ts * 0.001;
    let dt = now - (this.last || now);
    this.last = now;
    dt = Math.min(dt, 0.05);
    this.lastDt = dt;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }
}

/* ======================= START ======================= */
window.addEventListener('load', () => {
  let game;
  try {
    game = new Game();
  } catch (e) {
    document.getElementById('start').innerHTML =
      '<div class="panel"><h1>Ups</h1><p>Nie udało się uruchomić grafiki 3D.<br>' +
      String(e.message || e) + '</p></div>';
    console.error(e);
    return;
  }
  window.GAME = game;
  requestAnimationFrame(game.loop.bind(game));
});
