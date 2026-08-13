'use strict';
/* ---------- The Ship :: sterowanie dotykowe, pełny ekran, orientacja ---------- */

function isTouchDevice() {
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}

function isPortrait() {
  return window.innerHeight > window.innerWidth;
}

function requestFS(el) {
  const f = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (!f) return Promise.reject();
  try {
    const p = f.call(el);
    return p && p.catch ? p : Promise.resolve();
  } catch (e) { return Promise.reject(e); }
}

function tryLockLandscape() {
  try {
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { });
  } catch (e) { /* nie wszędzie dostępne — nic się nie stanie */ }
}

class TouchInput {
  constructor(game) {
    this.g = game;
    this.mobile = isTouchDevice();
    this.joyId = null; this.joyStart = [0, 0]; this.joyVec = [0, 0];
    this.lookId = null; this.lookLast = [0, 0];
    this.lookYawDelta = 0; this.lookPitchDelta = 0;
    this.fsDone = !this.mobile;
    this.gates = { fs: document.getElementById('fsGate'), rotate: document.getElementById('rotateGate') };
    this.ui = document.getElementById('touchUI');

    if (!this.mobile) return;
    document.body.classList.add('mobile');
    this.g.ui.start.classList.remove('show');
    this.gates.fs.classList.add('show');
    this.ui.classList.add('show');

    document.getElementById('fsBtn').addEventListener('click', () => {
      requestFS(document.documentElement).catch(() => { }).then(() => {
        tryLockLandscape();
        this.fsDone = true;
        this.gates.fs.classList.remove('show');
        this.checkOrientation();
      });
    });

    window.addEventListener('resize', () => this.checkOrientation());
    window.addEventListener('orientationchange', () => this.checkOrientation());

    this.bindJoystick();
    this.bindLook();
    this.bindButtons();
    this.checkOrientation();
  }

  checkOrientation() {
    if (!this.mobile || !this.fsDone) { if (this.g.r) this.g.r.resize(); return; }
    const g = this.g;
    if (isPortrait()) {
      this.gates.rotate.classList.add('show');
      g.ui.start.classList.remove('show');
      if (g.started && !g.paused) g.pause(true);
    } else {
      this.gates.rotate.classList.remove('show');
      if (!g.started) g.ui.start.classList.add('show');
    }
    if (this.g.r) this.g.r.resize();
  }

  bindJoystick() {
    const base = document.getElementById('joyBase'), knob = document.getElementById('joyKnob');
    const zone = document.getElementById('joyZone');
    const R = 52;
    const place = (x, y) => {
      base.style.left = (x - 60) + 'px'; base.style.top = (y - 60) + 'px';
      base.style.opacity = '1';
    };
    const moveKnob = (dx, dy) => {
      const d = Math.min(R, Math.hypot(dx, dy));
      const a = Math.atan2(dy, dx);
      knob.style.transform = 'translate(' + (Math.cos(a) * d) + 'px,' + (Math.sin(a) * d) + 'px)';
    };
    zone.addEventListener('touchstart', (e) => {
      if (this.joyId !== null) return;
      const t = e.changedTouches[0];
      this.joyId = t.identifier;
      this.joyStart = [t.clientX, t.clientY];
      place(t.clientX, t.clientY);
      moveKnob(0, 0);
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.joyId) continue;
        let dx = t.clientX - this.joyStart[0], dy = t.clientY - this.joyStart[1];
        const d = Math.hypot(dx, dy);
        if (d > R) { dx = dx / d * R; dy = dy / d * R; }
        this.joyVec = [dx / R, dy / R];
        moveKnob(dx, dy);
        e.preventDefault();
      }
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.joyId) continue;
        this.joyId = null; this.joyVec = [0, 0];
        base.style.opacity = '0'; moveKnob(0, 0);
      }
    };
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
  }

  bindLook() {
    const pad = document.getElementById('lookZone');
    pad.addEventListener('touchstart', (e) => {
      if (this.lookId !== null) return;
      const t = e.changedTouches[0];
      this.lookId = t.identifier;
      this.lookLast = [t.clientX, t.clientY];
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.lookId) continue;
        const dx = t.clientX - this.lookLast[0], dy = t.clientY - this.lookLast[1];
        this.lookLast = [t.clientX, t.clientY];
        this.lookYawDelta -= dx * 0.0044;
        this.lookPitchDelta -= dy * 0.0044;
        e.preventDefault();
      }
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.lookId) this.lookId = null;
    };
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
  }

  bindButtons() {
    const g = this.g;
    const tap = (id, fn) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    };
    tap('btnJump', () => { g.keys['Space'] = true; setTimeout(() => { g.keys['Space'] = false; }, 140); });
    tap('btnRun', () => { g.keys['ShiftLeft'] = !g.keys['ShiftLeft']; document.getElementById('btnRun').classList.toggle('on', g.keys['ShiftLeft']); });
    tap('btnInteract', () => { if (g.started && !g.paused) g.interact(); });
    tap('btnBuild', () => { if (g.started && !g.paused) g.toggleBuild(); });
    tap('btnMenu', () => { if (!g.started) return; g.paused ? g.resume() : g.pause(true); });
    tap('btnEmote', () => {
      if (!g.started || g.paused) return;
      const order = ['wave', 'dance', 'heart'];
      this.emoteIdx = ((this.emoteIdx || 0) + 1) % order.length;
      g.emote(order[this.emoteIdx]);
    });
    tap('btnPlace', () => {
      if (!g.buildMode) return;
      const t = g.builder.target(g.eye(), g.dir());
      if (g.builder.place(t)) { g.audio.place(); g.save(); } else g.audio.deny();
    });
    tap('btnRemove', () => {
      if (!g.buildMode) return;
      const t = g.builder.target(g.eye(), g.dir());
      if (g.builder.remove(t)) { g.audio.remove(); g.save(); } else g.audio.deny();
    });
  }

  update(dt) {
    if (!this.mobile) return;
    document.getElementById('btnPlace').classList.toggle('show', this.g.buildMode);
    document.getElementById('btnRemove').classList.toggle('show', this.g.buildMode);

    // joystick -> te same flagi co WASD, żeby nie dublować logiki ruchu
    const k = this.g.keys, v = this.joyVec;
    const dead = 0.18;
    k['KeyW'] = v[1] < -dead; k['KeyS'] = v[1] > dead;
    k['KeyA'] = v[0] < -dead; k['KeyD'] = v[0] > dead;

    if (this.lookYawDelta || this.lookPitchDelta) {
      this.g.p.yaw += this.lookYawDelta;
      this.g.p.pitch = clamp(this.g.p.pitch + this.lookPitchDelta, -1.5, 1.5);
      this.lookYawDelta = 0; this.lookPitchDelta = 0;
    }
  }
}
