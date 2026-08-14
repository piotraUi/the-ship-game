'use strict';
/* ---------- The Ship :: prolog fabularny ---------- */

const CREW = [
  {
    id: 'ren', name: 'Ren', role: 'kucharz',
    suit: 0xb0563f, skin: 0xd9a077, hair: 0xbfb8ae, accent: 0xffd166,
    pos: [-11.4, 0, 6.2], yaw: 1.9,
    lines: [
      'O, jesteś. Siadaj, zupa jeszcze ciepła.',
      'Wiesz, co jest najdziwniejsze? Trzy miesiące w kosmosie, a my dalej kłócimy się o to, kto zmywa.',
      'Jak będziesz tęsknić za Ziemią — przychodź. Czajnik zawsze stoi.'
    ]
  },
  {
    id: 'mira', name: 'Mira', role: 'botaniczka',
    suit: 0x4f8f5a, skin: 0xefc6a0, hair: 0x2f2118, accent: 0x9ff0c8,
    pos: [8.4, 0, -6.6], yaw: -1.3,
    lines: [
      'Ostrożnie z sadzonkami, dopiero się przyjęły.',
      'Zabrałam nasiona z ogrodu mojej mamy. Nie wiedziałam, czy w ogóle wzejdą.',
      'Wzeszły. Wszystkie co do jednego.'
    ]
  },
  {
    id: 'tobi', name: 'Tobi', role: 'mechanik',
    suit: 0xd08a3a, skin: 0xc98a5f, hair: 0x1f1a15, accent: 0x7fd8ff,
    pos: [-27.6, 0, -3.4], yaw: 0.6,
    lines: [
      'Słyszysz? Reaktor mruczy jak kot. Uwielbiam ten dźwięk.',
      'Jak coś zacznie piszczeć, to nie panikuj. Piszczy od miesiąca i nic się nie stało.',
      'Dobrze, że tu jesteś. Serio.'
    ]
  },
  {
    id: 'kaja', name: 'Kaja', role: 'nawigatorka',
    suit: 0x3f6fb0, skin: 0x8d6246, hair: 0x14100c, accent: 0x5fd8ee,
    pos: [31.4, 0, 3.5], yaw: -2.4,
    lines: [
      'Chodź, popatrz. Widzisz tę zieloną iskrę na sterburcie?',
      'Nazwałam ją roboczo Verdana Prime. Ładnie brzmi, nie?',
      'Nie ma jej na żadnej mapie. Czyli będziemy pierwsi.'
    ]
  }
];

class Story {
  constructor(game) {
    this.g = game;
    this.phase = 'none';
    this.met = {};
    this.metCount = 0;
    this.objective = '';
    this.alarm = 0;
    this.alarmT = 0;
    this.cine = null;
    this.dialog = null;
    this.npcs = [];
    this.meshes = {};
    this.timers = [];
    this.podT = 0;
    this.podTrigger = null;
  }

  get active() { return this.phase !== 'none' && this.phase !== 'free'; }

  /* ---------- start ---------- */
  begin() {
    const gl = this.g.gl;
    if (!this.meshes.built) {
      this.meshes.built = true;
      for (const c of CREW) this.meshes[c.id] = buildHuman(gl, c);
      this.meshes.pod = this.buildPod(gl);
      this.meshes.dockPod = this.buildDockedPod(gl);
    }
    this.npcs = CREW.map(c => ({ def: c, pos: c.pos.slice(), yaw: c.yaw, line: 0, gone: false }));
    this.podTrigger = null;
    this.phase = 'wake';
    this.setObjective('Wstań i wyjdź ze swojej kajuty');
    this.g.p.pos = [-13.6, 0, -12.0];
    this.g.p.yaw = -0.6;
    this.g.p.pitch = -0.1;
    this.g.p.vel = [0, 0, 0];
    this.g.toast('Trzy miesiące od startu. Statek "The Ship", gdzieś między gwiazdami.', true);
  }

  buildPod(gl) {
    const mb = new MeshBuilder();
    mb.cylinder(0, 0, 0, 0.85, 1.5, 12, TILE.PANEL, col(0xdfe4ea), { uvScale: 0.8 });
    mb.cylinder(0, 1.5, 0, 0.85, 0.7, 12, TILE.PANEL, col(0xc8ced6), { rTop: 0.35 });
    mb.cylinder(0, -0.45, 0, 0.6, 0.45, 12, TILE.RIDGE, col(0x4e545c), { rTop: 0.85 });
    mb.box(-0.42, 0.55, 0.80, 0.42, 1.15, 0.92, TILE.LIGHT, col(0x9fe8ff), { emis: 0.5 });
    mb.cylinder(0, -0.75, 0, 0.42, 0.3, 10, TILE.LIGHT, col(0x8fd8ff), { emis: 1 });
    return new Mesh(gl, mb);
  }

  /* kapsuła zadokowana bokiem w okrągłej niszy – oś kapsuły biegnie wzdłuż lokalnego X,
     żeby jej przekrój pasował do okrągłego włazu (mb.cylinder rośnie tylko wzdłuż Y) */
  buildDockedPod(gl) {
    const mb = new MeshBuilder();
    const seg = 14;
    const backC = col(0x4e545c), bodyC = col(0xdfe4ea), winC = col(0x9fe8ff), noseC = col(0xc8ced6);
    const stops = [
      { x: -0.60, r: 0.40, tile: TILE.RIDGE, c: backC, emis: 0.15 },
      { x: -0.32, r: 0.80, tile: TILE.PANEL, c: bodyC, emis: 0 },
      { x: 0.05, r: 0.80, tile: TILE.PANEL, c: bodyC, emis: 0 },
      { x: 0.14, r: 0.80, tile: TILE.LIGHT, c: winC, emis: 0.75 },
      { x: 0.23, r: 0.80, tile: TILE.PANEL, c: bodyC, emis: 0 },
      { x: 0.55, r: 0.80, tile: TILE.PANEL, c: bodyC, emis: 0 },
      { x: 0.95, r: 0.28, tile: TILE.PANEL, c: noseC, emis: 0 }
    ];
    for (let s = 0; s < stops.length - 1; s++) {
      const A = stops[s], B = stops[s + 1];
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
        mb.quad(
          [A.x, Math.cos(a0) * A.r, Math.sin(a0) * A.r],
          [B.x, Math.cos(a0) * B.r, Math.sin(a0) * B.r],
          [B.x, Math.cos(a1) * B.r, Math.sin(a1) * B.r],
          [A.x, Math.cos(a1) * A.r, Math.sin(a1) * A.r],
          A.tile, A.c, { uvScale: 0.6, emis: A.emis });
      }
    }
    const back = stops[0], nose = stops[stops.length - 1];
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      // denko tylne (silnik), normalna -X
      const jA = mb.vertex(back.x - 0.03, 0, 0, -1, 0, 0, 0.5, 0.5, backC, 0.3, TILE.LIGHT);
      const jB = mb.vertex(back.x - 0.03, Math.cos(a1) * back.r, Math.sin(a1) * back.r, -1, 0, 0, 1, 0, backC, 0.3, TILE.LIGHT);
      const jC = mb.vertex(back.x - 0.03, Math.cos(a0) * back.r, Math.sin(a0) * back.r, -1, 0, 0, 0, 0, backC, 0.3, TILE.LIGHT);
      mb.idx.push(jA, jB, jC);
      // czapeczka dziobu, normalna +X
      const iA = mb.vertex(nose.x + 0.08, 0, 0, 1, 0, 0, 0.5, 0.5, noseC, 0, TILE.PLAIN);
      const iB = mb.vertex(nose.x, Math.cos(a0) * nose.r, Math.sin(a0) * nose.r, 1, 0, 0, 0, 0, noseC, 0, TILE.PLAIN);
      const iC = mb.vertex(nose.x, Math.cos(a1) * nose.r, Math.sin(a1) * nose.r, 1, 0, 0, 1, 0, noseC, 0, TILE.PLAIN);
      mb.idx.push(iA, iC, iB);
    }
    return new Mesh(gl, mb);
  }

  setObjective(t) {
    this.objective = t;
    const el = document.getElementById('objective');
    if (!t) { el.classList.remove('show'); return; }
    el.innerHTML = '<span class="mark">▸</span> ' + t;
    el.classList.add('show');
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  }

  later(sec, fn) { this.timers.push({ t: sec, fn: fn }); }

  /* ---------- interakcje ---------- */
  interactables() {
    const out = [];
    if (this.phase === 'meet') {
      for (const n of this.npcs) {
        if (n.gone) continue;
        out.push({
          id: 'npc:' + n.def.id, npc: n, pos: [n.pos[0], 1.35, n.pos[2]], r: 3.0,
          label: (this.met[n.def.id] ? 'Pogadaj z: ' : 'Poznaj: ') + n.def.name + ' (' + n.def.role + ')'
        });
      }
    }
    if (this.phase === 'check') {
      out.push({ id: 'alarmpanel', pos: [-26.8, 1.5, -6.4], r: 2.8, label: 'Sprawdź panel alarmowy' });
    }
    if (this.phase === 'window') {
      out.push({ id: 'lookwindow', pos: [9, 1.5, 13.2], r: 3.6, label: 'Wyjrzyj przez okno' });
    }
    return out;
  }

  handle(id) {
    if (id === 'alarmpanel') { this.onAlarmPanel(); return true; }
    if (id === 'lookwindow') { this.onWindow(); return true; }
    if (id === 'pods') {
      this.g.audio.ui();
      this.g.toast(this.phase === 'free'
        ? 'Cztery puste kołyski po kapsułach. Statek jest cały twój.'
        : 'Kapsuły ratunkowe.');
      return true;
    }
    return false;
  }

  talkTo(n) {
    const d = n.def;
    if (this.dialog && this.dialog.npc === n) { this.advanceDialog(); return; }
    this.dialog = { npc: n, i: 0 };
    this.showDialog();
    this.g.audio.blip(420, 0.08, 0.05, 'triangle');
  }

  showDialog() {
    const d = this.dialog;
    const el = document.getElementById('dialog');
    const def = d.npc.def;
    el.innerHTML = '<div class="who">' + def.name + ' <span>· ' + def.role + '</span></div>' +
      '<div class="say">' + def.lines[d.i] + '</div>' +
      '<div class="more">[E] dalej</div>';
    el.classList.add('show');
  }

  advanceDialog() {
    const d = this.dialog;
    if (!d) return;
    d.i++;
    if (d.i >= d.npc.def.lines.length) {
      this.closeDialog();
      if (!this.met[d.npc.def.id]) {
        this.met[d.npc.def.id] = true;
        this.metCount++;
        this.g.mood = Math.min(100, this.g.mood + 6);
        if (this.metCount >= CREW.length) {
          this.phase = 'rest';
          this.setObjective('Wróć do kajuty i odpocznij (łóżko: [E])');
          this.g.toast('Dni mijają spokojnie. Dobrze wam razem.', true);
        } else {
          this.setObjective('Poznaj załogę (' + this.metCount + '/' + CREW.length + ')');
        }
      }
      return;
    }
    this.showDialog();
    this.g.audio.blip(380 + d.i * 40, 0.07, 0.04, 'triangle');
  }

  closeDialog() {
    this.dialog = null;
    document.getElementById('dialog').classList.remove('show');
  }

  /* ---------- kolejne etapy ---------- */
  onRest() {
    if (this.phase !== 'rest') return false;
    this.g.audio.ui();
    this.g.fadeTo(() => {
      this.phase = 'alarm';
      this.alarm = 1;
      this.alarmT = 0;
      this.g.audio.sirenOn();
      this.setObjective('EWAKUACJA — kapsuły ratunkowe są w ładowni');
      this.g.toast('⚠ ALARM OGÓLNY. NATYCHMIASTOWA EWAKUACJA.', true);
      this.later(2.2, () => this.g.toast('Kaja: ALARM! Wszyscy do kapsuł, już!'));
      this.later(5.5, () => this.g.toast('Tobi: Biegnij! Nie czekaj na nas!'));
      this.later(9.0, () => { this.npcs.forEach(n => n.gone = true); });
      this.later(9.2, () => this.g.toast('Mira: ...a gdzie on jest? Ktoś go widział?'));
    });
    return true;
  }

  onCargoReached() {
    this.phase = 'pods';
    this.setObjective('Znajdź wolną kapsułę');
    const t0 = this.g.time;
    this.podTrigger = [t0, null, null, null];
    this.g.audio.noiseBurst(0.9, 700, 120, 0.22, 'bandpass');
    this.g.toast('Kapsuła 1 — ODŁĄCZONA.');
    this.later(1.6, () => { this.podTrigger[1] = this.g.time; this.g.audio.noiseBurst(0.9, 700, 120, 0.22, 'bandpass'); this.g.toast('Kapsuła 2 — ODŁĄCZONA.'); });
    this.later(3.0, () => { this.podTrigger[2] = this.g.time; this.g.audio.noiseBurst(0.9, 700, 120, 0.22, 'bandpass'); this.g.toast('Kapsuła 3 — ODŁĄCZONA.'); });
    this.later(4.6, () => { this.podTrigger[3] = this.g.time; this.g.audio.noiseBurst(0.9, 700, 120, 0.22, 'bandpass'); this.g.toast('Kapsuła 4 — ODŁĄCZONA. 41 sekund temu.'); });
    this.later(7.0, () => {
      this.g.audio.sirenOff();
      this.alarm = 0;
      this.g.toast('Alarm milknie. Zostaje tylko szum wentylacji.', true);
      this.phase = 'check';
      this.setObjective('Sprawdź panel alarmowy w maszynowni');
    });
  }

  onAlarmPanel() {
    this.g.audio.ui();
    this.g.toast('PANEL: TEST SYSTEMU EWAKUACYJNEGO nr 7 — alarm próbny. Brak zagrożenia.', true);
    this.later(3.4, () => this.g.toast('Ćwiczenia. To były tylko ćwiczenia.'));
    this.phase = 'window';
    this.setObjective('Wyjrzyj przez okno w salonie');
  }

  onWindow() {
    this.g.audio.ui();
    this.startCine();
  }

  /* ---------- scena końcowa prologu ---------- */
  startCine() {
    this.closeDialog();
    this.setObjective('');
    this.podT = 0;
    this.cine = {
      t: 0,
      shots: [
        {
          dur: 4.5, fov: 0.95,
          camFrom: [9, 1.62, 11.2], camTo: [9, 1.66, 12.7],
          lookFrom: [11.5, 3.4, 24], lookTo: [12.4, 5.2, 32],
          text: 'Cztery światła oddalają się od statku.'
        },
        {
          dur: 6.0, fov: 1.05,
          camFrom: [1, 15, -16], camTo: [6, 21, 8],
          lookFrom: [16, 12, 58], lookTo: [21, 19, 88],
          text: 'Nikt nie wrócił. Nikt nie odpowiedział na wywołanie.'
        },
        {
          dur: 6.5, fov: 0.85,
          camFrom: [28, 28, 118], camTo: [31, 31, 132],
          lookFrom: [44, 47, 240], lookTo: [46, 49, 252],
          text: 'Kurs kapsuł: VERDANA PRIME.',
          note: 'Planeta, której nie ma na żadnej mapie.'
        }
      ]
    };
    document.getElementById('film').classList.add('show', 'soft');
    document.body.classList.add('cinema');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  cineShot() {
    if (!this.cine) return null;
    let acc = 0;
    for (const s of this.cine.shots) {
      if (this.cine.t < acc + s.dur) return { s: s, local: (this.cine.t - acc) / s.dur };
      acc += s.dur;
    }
    return null;
  }

  cameraOverride() {
    const cur = this.cineShot();
    if (!cur) return null;
    const e = smoothstep(0, 1, cur.local);
    const L = (a, b) => [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e)];
    const pos = L(cur.s.camFrom, cur.s.camTo), look = L(cur.s.lookFrom, cur.s.lookTo);
    return {
      pos: pos,
      dir: vnorm([look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]]),
      fov: cur.s.fov
    };
  }

  endCine() {
    this.cine = null;
    this.npcs.forEach(n => { n.gone = true; });
    this.timers.length = 0;
    this.g.audio.sirenOff();
    this.alarm = 0;
    document.getElementById('film').classList.remove('show', 'soft');
    document.body.classList.remove('cinema');
    document.getElementById('filmText').innerHTML = '';
    this.phase = 'free';
    this.setObjective('');
    this.g.loc = { state: 'space', planet: null };
    this.g.applyLocation();
    this.g.p.pos = [9, 0, 11];
    this.g.p.yaw = -Math.PI / 2;
    this.g.toast('Nawigacja zapisała kurs kapsuł: Verdana Prime.', true);
    this.later(5, () => this.g.toast('Zostałeś sam. Cały statek należy teraz do ciebie.', true));
    this.later(10, () => this.g.toast('Mostek jest na wschodnim końcu korytarza. Możesz lecieć, gdzie chcesz.', true));
    this.g.save();
    if (!this.g.paused) this.g.lockPointer();
  }

  /* ---------- aktualizacja ---------- */
  update(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      this.timers[i].t -= dt;
      if (this.timers[i].t <= 0) { const f = this.timers[i].fn; this.timers.splice(i, 1); f(); }
    }

    if (this.cine) {
      this.cine.t += dt;
      this.podT += dt;
      const cur = this.cineShot();
      if (!cur) { this.endCine(); return; }
      if (this.cine.last !== cur.s) {
        this.cine.last = cur.s;
        const tx = document.getElementById('filmText');
        tx.innerHTML = '<span class="l1">' + cur.s.text + '</span>' +
          (cur.s.note ? '<span class="l2">' + cur.s.note + '</span>' : '');
        tx.classList.remove('in'); void tx.offsetWidth; tx.classList.add('in');
      }
      return;
    }

    if (this.alarm > 0) {
      this.alarmT += dt;
    }

    const p = this.g.p.pos;
    if (this.phase === 'wake') {
      const r = this.g.ship.roomAt(p[0], p[2]);
      if (!r || r.id !== 'quarters') {
        this.phase = 'meet';
        this.setObjective('Poznaj załogę (0/' + CREW.length + ')');
        this.g.toast('Gdzieś na statku jest czwórka ludzi, z którymi tu utknąłeś. Na szczęście to dobrzy ludzie.', true);
      }
    } else if (this.phase === 'alarm') {
      const r = this.g.ship.roomAt(p[0], p[2]);
      if (r && r.id === 'cargo') this.onCargoReached();
    }

    // obracanie postaci w stronę gracza, gdy blisko
    for (const n of this.npcs) {
      if (n.gone) continue;
      const dx = p[0] - n.pos[0], dz = p[2] - n.pos[2];
      const d = Math.hypot(dx, dz);
      if (d < 5) {
        const want = Math.atan2(dx, dz);
        let diff = want - n.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        n.yaw += diff * Math.min(1, dt * 3);
      }
    }
  }

  /* czerwone światło alarmu */
  tintLights(lights) {
    if (this.alarm <= 0) return lights;
    const pulse = 0.55 + Math.sin(this.alarmT * 5.2) * 0.45;
    return lights.map(l => ({
      pos: l.pos,
      col: [0.35 + pulse * 0.95, 0.05 + pulse * 0.06, 0.05 + pulse * 0.06]
    }));
  }
  tintAmbient(a) {
    if (this.alarm <= 0) return a;
    const pulse = 0.5 + Math.sin(this.alarmT * 5.2) * 0.5;
    return [0.20 + pulse * 0.14, 0.055, 0.06];
  }

  /* ---------- rysowanie ---------- */
  renderExtra(r, game) {
    const m = game.mats.tmp;
    for (const n of this.npcs) {
      if (n.gone) continue;
      const bob = Math.sin(game.time * 1.5 + n.pos[0]) * 0.012;
      r.draw(this.meshes[n.def.id], m4trs(m, n.pos[0], n.pos[1] + bob, n.pos[2], n.yaw, 1));
    }
    // kapsuły w ładowni: zadokowane, dopóki nie przyjdzie ich kolej na odłączenie
    const slots = game.ship.podSlots;
    if (this.meshes.dockPod && slots) {
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const trig = this.podTrigger ? this.podTrigger[i] : null;
        let x = s.pos[0], y = s.pos[1], z = s.pos[2], yaw = 0, emisMul = 0.6;
        if (trig !== null && trig !== undefined) {
          const el = game.time - trig;
          const slide = Math.min(1, el / 1.3) * 1.6;
          const accel = Math.max(0, el - 1.3);
          const dist = slide + accel * accel * 1.5;
          x += dist;
          y += accel * 0.3 + Math.sin(el * 0.6 + i) * 0.1;
          z += accel * (0.4 + i * 0.16);
          yaw = accel * (0.3 + i * 0.1);
          emisMul = 1.5;
        }
        r.draw(this.meshes.dockPod, m4trs(m, x, y, z, yaw, 1), { emisMul: emisMul });
      }
    }

    if (this.cine) {
      // odlatujące kapsuły
      const dir = vnorm([0.12, 0.18, 0.97]);
      for (let i = 0; i < 4; i++) {
        const t = this.podT + i * 0.5;
        const d = 12 + t * t * 0.75 + i * 5;
        const wob = Math.sin(t * 0.7 + i) * (1.6 + i * 0.9);
        r.draw(this.meshes.pod, m4trs(m,
          13 + dir[0] * d + wob, 2 + dir[1] * d + Math.cos(t * 0.55 + i) * 1.2, 16 + dir[2] * d,
          i * 1.3 + t * 0.2, 1), { emisMul: 1.7 });
      }
    }
  }
}
