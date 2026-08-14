'use strict';
/* ---------- The Ship :: tryb budowania we wnętrzu statku ---------- */

const BUILD_ITEMS = [
  {
    name: 'Skrzynia', h: 1.0, icon: '📦',
    build: (mb, c) => {
      mb.box(-0.45, 0, -0.45, 0.45, 0.95, 0.45, TILE.PANEL, c, { uvScale: 1 });
      mb.box(-0.48, 0.4, -0.48, 0.48, 0.5, 0.48, TILE.PLAIN, col(0x5b636d), { uvScale: 1 });
      mb.box(-0.2, 0.95, -0.2, 0.2, 1.0, 0.2, TILE.PLAIN, col(0x5b636d), { uvScale: 1 });
    }
  },
  {
    name: 'Stół', h: 0.8, icon: '🪵',
    build: (mb, c) => {
      mb.box(-0.5, 0.7, -0.5, 0.5, 0.8, 0.5, TILE.WOOD, c, { uvScale: 0.8 });
      for (const dx of [-0.4, 0.4]) for (const dz of [-0.4, 0.4])
        mb.box(dx - 0.05, 0, dz - 0.05, dx + 0.05, 0.7, dz + 0.05, TILE.WOOD, colScale(c, 0.85), { uvScale: 1 });
    }
  },
  {
    name: 'Krzesło', h: 0.95, icon: '🪑',
    build: (mb, c) => {
      mb.box(-0.28, 0.42, -0.28, 0.28, 0.5, 0.28, TILE.CARPET, c, { uvScale: 1 });
      mb.box(-0.28, 0.5, -0.3, 0.28, 1.0, -0.22, TILE.CARPET, colScale(c, 0.9), { uvScale: 1 });
      for (const dx of [-0.22, 0.22]) for (const dz of [-0.22, 0.22])
        mb.box(dx - 0.04, 0, dz - 0.04, dx + 0.04, 0.42, dz + 0.04, TILE.WOOD, col(0xc9a578), { uvScale: 1 });
    }
  },
  {
    name: 'Roślina', h: 1.3, icon: '🪴',
    build: (mb, c) => {
      mb.cylinder(0, 0, 0, 0.28, 0.42, 10, TILE.PANEL, col(0xd8a07a), { rTop: 0.34 });
      mb.cylinder(0, 0.42, 0, 0.32, 0.06, 10, TILE.SOIL, col(0x9c7a55), {});
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * 6.28;
        mb.transform(Math.cos(a) * 0.12, 0.48, Math.sin(a) * 0.12, a, 1);
        mb.cross(0, 0, 0, 0.55, 0.75 + (i % 3) * 0.18, TILE.LEAF, colScale(c, 0.85 + (i % 3) * 0.12), {});
        mb.resetTransform();
      }
    }
  },
  {
    name: 'Lampa', h: 1.7, icon: '💡', light: col(0xffcf95),
    build: (mb, c) => {
      mb.cylinder(0, 0, 0, 0.22, 0.06, 10, TILE.PLAIN, col(0x50586a), {});
      mb.cylinder(0, 0.06, 0, 0.05, 1.2, 8, TILE.PLAIN, col(0x6a7280), {});
      mb.cylinder(0, 1.26, 0, 0.16, 0.42, 12, TILE.PANEL, c, { rTop: 0.34, noCap: true });
      mb.cylinder(0, 1.28, 0, 0.3, 0.05, 12, TILE.LIGHT, col(0xffe6b8), { emis: 1 });
    }
  },
  {
    name: 'Leżanka', h: 0.65, icon: '🛏️',
    build: (mb, c) => {
      mb.box(-0.48, 0.12, -0.48, 0.48, 0.42, 0.48, TILE.WOOD, col(0xd8b087), { uvScale: 1 });
      mb.box(-0.46, 0.42, -0.46, 0.46, 0.62, 0.46, TILE.CARPET, c, { uvScale: 1 });
      mb.box(-0.4, 0.62, -0.44, 0.0, 0.72, -0.12, TILE.CARPET, col(0xffffff), { uvScale: 1 });
    }
  },
  {
    name: 'Regał', h: 2.1, icon: '🗄️',
    build: (mb, c) => {
      mb.box(-0.45, 0, -0.22, 0.45, 2.1, -0.14, TILE.WOOD, colScale(c, 0.9), { uvScale: 0.8 });
      for (let i = 0; i < 4; i++) {
        const y = 0.35 + i * 0.5;
        mb.box(-0.45, y, -0.22, 0.45, y + 0.06, 0.24, TILE.WOOD, c, { uvScale: 0.8 });
        const rnd = mulberry(i * 31 + 7);
        for (let k = 0; k < 5; k++) {
          const x = -0.38 + k * 0.16;
          mb.box(x, y + 0.06, -0.16, x + 0.11, y + 0.06 + 0.2 + rnd() * 0.16, 0.14, TILE.PLAIN,
            [0.4 + rnd() * 0.55, 0.4 + rnd() * 0.5, 0.4 + rnd() * 0.55], { uvScale: 1 });
        }
      }
      for (const dx of [-0.45, 0.37]) mb.box(dx, 0, -0.22, dx + 0.08, 2.1, 0.24, TILE.WOOD, colScale(c, 0.8), { uvScale: 1 });
    }
  },
  {
    name: 'Blok', h: 1.0, icon: '🧱',
    build: (mb, c) => {
      mb.box(-0.5, 0, -0.5, 0.5, 1.0, 0.5, TILE.PANEL, c, { uvScale: 0.9 });
    }
  },
  {
    name: 'Dywan', h: 0.04, icon: '🟪',
    build: (mb, c) => {
      mb.plane(-0.5, -0.5, 0.5, 0.5, 0.03, TILE.CARPET, c, { uvScale: 0.9 });
    }
  },
  {
    name: 'Holo-ekran', h: 1.6, icon: '🖥️', light: col(0x7fd8ff),
    build: (mb, c) => {
      mb.box(-0.22, 0, -0.14, 0.22, 0.1, 0.14, TILE.PLAIN, col(0x3d4552), { uvScale: 1 });
      mb.box(-0.05, 0.1, -0.05, 0.05, 0.6, 0.05, TILE.PLAIN, col(0x5b636d), { uvScale: 1 });
      mb.box(-0.55, 0.6, -0.04, 0.55, 1.55, 0.04, TILE.PANEL, col(0x2c333d), { uvScale: 1 });
      mb.box(-0.5, 0.66, -0.06, 0.5, 1.49, -0.045, TILE.LIGHT, c, { emis: 1 });
    }
  }
];

const BUILD_COLORS = [
  col(0xe8dfd0), col(0x8fc4e8), col(0xf0b48a), col(0xa8e0a8),
  col(0xd8a8e8), col(0xffd98a), col(0xb8bcc4), col(0xff9f9f)
];

class Builder {
  constructor(gl, ship) {
    this.gl = gl;
    this.ship = ship;
    this.cells = {};              // "x,z" -> [{t, yaw, c}]
    this.mesh = new Mesh(gl, new MeshBuilder());
    this.lights = [];
    this.sel = 0;
    this.colorIdx = 0;
    this.yaw = 0;
    this.active = false;
    this.ghosts = BUILD_ITEMS.map(it => {
      const mb = new MeshBuilder();
      it.build(mb, col(0x9fe8ff));
      return new Mesh(gl, mb);
    });
    this.dirty = false;
  }

  key(x, z) { return x + ',' + z; }
  stack(x, z) { return this.cells[this.key(x, z)] || null; }
  stackTop(x, z) {
    const s = this.stack(x, z);
    if (!s) return 0;
    let h = 0;
    for (const it of s) h += BUILD_ITEMS[it.t].h;
    return h;
  }

  canBuildAt(x, z) {
    const cx = x + 0.5, cz = z + 0.5;
    const r = this.ship.roomAt(cx, cz);
    if (!r) return false;
    if (cx < r.x0 + 0.45 || cx > r.x1 - 0.45 || cz < r.z0 + 0.45 || cz > r.z1 - 0.45) return false;
    // nie blokuj przejść w drzwiach
    for (const d of this.ship.doors) {
      if (Math.abs(cx - d.pos[0]) < 2.0 && Math.abs(cz - d.pos[2]) < 2.0) return false;
    }
    return true;
  }

  /* wyznacza pole, na które patrzy gracz */
  target(pos, dir, maxDist) {
    const step = 0.12;
    for (let t = 0.5; t < (maxDist || 7); t += step) {
      const px = pos[0] + dir[0] * t, py = pos[1] + dir[1] * t, pz = pos[2] + dir[2] * t;
      const cx = Math.floor(px), cz = Math.floor(pz);
      if (!this.canBuildAt(cx, cz)) continue;
      const top = this.stackTop(cx, cz);
      if (py <= top + 0.02) {
        return { x: cx, z: cz, y: top, hasStack: !!this.stack(cx, cz) };
      }
    }
    return null;
  }

  place(t) {
    if (!t) return false;
    const k = this.key(t.x, t.z);
    if ((this.cells[k] || []).length >= 6) return false;
    this.placeAt(k, [this.sel, this.yaw, this.colorIdx]);
    return true;
  }

  remove(t) {
    if (!t) return false;
    const k = this.key(t.x, t.z);
    if (!this.cells[k] || !this.cells[k].length) return false;
    this.removeAt(k);
    return true;
  }

  /* stosuje umieszczenie/usunięcie przyszłe z sieci (od innego gracza) — bez rzutowania promienia */
  placeAt(key, item) {
    if (!this.cells[key]) this.cells[key] = [];
    if (this.cells[key].length >= 6) return;
    this.cells[key].push({ t: item[0], yaw: item[1], c: item[2] || 0 });
    this.rebuild();
  }

  removeAt(key) {
    const s = this.cells[key];
    if (!s || !s.length) return;
    s.pop();
    if (!s.length) delete this.cells[key];
    this.rebuild();
  }

  rebuild() {
    const mb = new MeshBuilder();
    this.lights = [];
    for (const k in this.cells) {
      const parts = k.split(',');
      const x = parseFloat(parts[0]) + 0.5, z = parseFloat(parts[1]) + 0.5;
      let y = 0;
      for (const it of this.cells[k]) {
        const def = BUILD_ITEMS[it.t];
        mb.transform(x, y, z, it.yaw, 1);
        def.build(mb, BUILD_COLORS[it.c % BUILD_COLORS.length]);
        mb.resetTransform();
        if (def.light) this.lights.push({ pos: [x, y + def.h * 0.85, z], col: colScale(def.light, 0.9) });
        y += def.h;
      }
    }
    this.mesh.update(mb);
    this.dirty = true;
  }

  colliders() {
    const out = [];
    for (const k in this.cells) {
      const parts = k.split(',');
      const x = parseFloat(parts[0]), z = parseFloat(parts[1]);
      const h = this.stackTop(x, z);
      if (h > 0.25) out.push([x + 0.05, 0, z + 0.05, x + 0.95, h, z + 0.95]);
    }
    return out;
  }

  serialize() {
    const o = {};
    for (const k in this.cells) o[k] = this.cells[k].map(it => [it.t, Math.round(it.yaw * 100) / 100, it.c]);
    return o;
  }

  load(o) {
    this.cells = {};
    if (!o) return;
    for (const k in o) {
      this.cells[k] = o[k].map(a => ({ t: a[0], yaw: a[1], c: a[2] || 0 }));
    }
    this.rebuild();
  }

  count() {
    let n = 0;
    for (const k in this.cells) n += this.cells[k].length;
    return n;
  }
}
