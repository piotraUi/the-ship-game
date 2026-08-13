'use strict';
/* ---------- The Ship :: statek (pomieszczenia, ściany, drzwi, wyposażenie) ---------- */

const FLOOR_Y = 0;
const CEIL_Y = 3.2;
const HULL_TOP = 3.6;
const HULL_BOT = -0.6;
const WALL_T = 0.24;
const WALL_Y0 = -0.55;
const WALL_Y1 = 3.55;

const C = {
  hull: col(0x9aa3ad),
  hullDark: col(0x6a727c),
  panel: col(0xf2efe8),
  panelWarm: col(0xf0e4d2),
  accent: col(0x4fd0e0),
  accentWarm: col(0xffb765),
  grate: col(0x9aa2ac),
  wood: col(0xffffff),
  green: col(0x8fd06a),
  glass: col(0x9fd8f0),
  dark: col(0x3c434c),
  white: col(0xffffff)
};

/* pomieszczenia (prostokąty pokładu) */
const RECTS = [
  { id: 'corridor', name: 'Korytarz', x0: -24, x1: 26, z0: -2.2, z1: 2.2, floorTile: TILE.GRATE, floorCol: C.grate, ceilCol: col(0xe4e6ea) },
  { id: 'galley', name: 'Kuchnia', x0: -16, x1: -4, z0: 2.2, z1: 14, floorTile: TILE.WOOD, floorCol: C.wood, ceilCol: col(0xf6ecdc) },
  { id: 'lounge', name: 'Salon widokowy', x0: 2, x1: 16, z0: 2.2, z1: 14, floorTile: TILE.CARPET, floorCol: col(0xc9b8e0), ceilCol: col(0xf0eef6) },
  { id: 'airlock', name: 'Śluza', x0: 18, x1: 24, z0: 2.2, z1: 9, floorTile: TILE.GRATE, floorCol: col(0x8f98a3), ceilCol: col(0xdfe3e8) },
  { id: 'quarters', name: 'Twoja kajuta', x0: -16, x1: -4, z0: -14, z1: -2.2, floorTile: TILE.CARPET, floorCol: col(0xd8c2ad), ceilCol: col(0xf6efe6) },
  { id: 'greenhouse', name: 'Oranżeria', x0: 2, x1: 16, z0: -14, z1: -2.2, floorTile: TILE.SOIL, floorCol: col(0xbfae95), ceilCol: col(0xe8f4e6) },
  { id: 'cargo', name: 'Ładownia', x0: 17, x1: 26, z0: -12, z1: -2.2, floorTile: TILE.GRATE, floorCol: col(0x99a1ab), ceilCol: col(0xdcdfe4) },
  { id: 'engine', name: 'Maszynownia', x0: -38, x1: -24, z0: -8, z1: 8, floorTile: TILE.RIDGE, floorCol: col(0x8b929c), ceilCol: col(0xc9ced5) },
  { id: 'bridge', name: 'Mostek', x0: 26, x1: 40, z0: -7, z1: 7, floorTile: TILE.PANEL, floorCol: col(0x8c94a0), ceilCol: col(0xd4dae2) }
];

function rectById(id) { for (const r of RECTS) if (r.id === id) return r; return null; }

/* ====================== BUDOWA ŚWIATA STATKU ====================== */
class Ship {
  constructor(gl) {
    this.gl = gl;
    this.colliders = [];
    this.lights = [];
    this.doors = [];
    this.interact = [];
    this.rects = RECTS;

    const mb = new MeshBuilder();
    const glass = new MeshBuilder();
    this.mb = mb; this.glassMb = glass;

    this.buildDecks(mb);
    this.buildWalls(mb, glass);
    this.buildHullExtras(mb);
    this.buildFurniture(mb);

    this.mesh = new Mesh(gl, mb);
    this.glass = new Mesh(gl, glass);

    // pojedynczy panel drzwi (jednostkowy, skalowany macierzą modelu)
    const dp = new MeshBuilder();
    dp.box(-0.5, 0, -0.06, 0.5, 1, 0.06, TILE.DOOR, col(0xc3ccd6), {
      faces: { py: TILE.HULL, ny: TILE.HULL }, uvScale: 0.6
    });
    dp.box(-0.5, 0.98, -0.07, 0.5, 1.0, 0.07, TILE.LIGHT, C.accent, { emis: 1 });
    this.doorPanel = new Mesh(gl, dp);

    // hologram / świecące elementy animowane
    const hb = new MeshBuilder();
    hb.box(-0.5, 0, -0.5, 0.5, 1, 0.5, TILE.LIGHT, C.accent, { emis: 1 });
    this.glowBox = new Mesh(gl, hb);
  }

  solid(x0, y0, z0, x1, y1, z1) {
    this.colliders.push([x0, y0, z0, x1, y1, z1]);
  }
  light(x, y, z, c, s) {
    this.lights.push({ pos: [x, y, z], col: colScale(c, s === undefined ? 1 : s) });
  }
  addInteract(id, x, y, z, r, label, extra) {
    const o = { id: id, pos: [x, y, z], r: r, label: label };
    if (extra) for (const k in extra) o[k] = extra[k];
    this.interact.push(o);
    return o;
  }

  /* --- podłogi, sufity, kadłub góra/dół --- */
  buildDecks(mb) {
    for (const r of RECTS) {
      mb.plane(r.x0, r.z0, r.x1, r.z1, FLOOR_Y, r.floorTile, r.floorCol, { uvScale: 0.35 });
      mb.plane(r.x0, r.z0, r.x1, r.z1, CEIL_Y, TILE.PANEL, r.ceilCol, { down: true, uvScale: 0.3 });
      mb.plane(r.x0, r.z0, r.x1, r.z1, HULL_TOP, TILE.HULL, C.hull, { uvScale: 0.25 });
      mb.plane(r.x0, r.z0, r.x1, r.z1, HULL_BOT, TILE.HULL, C.hullDark, { down: true, uvScale: 0.25 });

      // świetlówki pod sufitem
      const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
      const long = (r.x1 - r.x0) > (r.z1 - r.z0);
      const n = Math.max(1, Math.floor(Math.max(r.x1 - r.x0, r.z1 - r.z0) / 7));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const px = long ? lerp(r.x0 + 2, r.x1 - 2, t) : cx;
        const pz = long ? cz : lerp(r.z0 + 2, r.z1 - 2, t);
        if (long) mb.box(px - 2.2, CEIL_Y - 0.12, pz - 0.35, px + 2.2, CEIL_Y - 0.02, pz + 0.35, TILE.LIGHT, C.white, { emis: 1 });
        else mb.box(px - 0.35, CEIL_Y - 0.12, pz - 2.2, px + 0.35, CEIL_Y - 0.02, pz + 2.2, TILE.LIGHT, C.white, { emis: 1 });
        this.light(px, CEIL_Y - 0.35, pz, r.id === 'galley' ? col(0xffd9a8) : (r.id === 'greenhouse' ? col(0xcaffd0) : col(0xdfeaff)), 0.55);
      }
    }
  }

  /* --- ściana z otworami (drzwi / okna) --- */
  wall(mb, glass, s) {
    const axis = s.axis;                 // 'x' – biegnie wzdłuż X (stałe z), 'z' – wzdłuż Z
    const at = s.at;
    const a0 = Math.min(s.a0, s.a1), a1 = Math.max(s.a0, s.a1);
    const inSide = s.inSide === undefined ? 1 : s.inSide;
    const texIn = s.texIn === undefined ? TILE.PANEL : s.texIn;
    const texOut = s.texOut === undefined ? TILE.HULL : s.texOut;
    const colIn = s.colIn || (texIn === TILE.HULL ? C.hull : C.panel);
    const colOut = s.colOut || (texOut === TILE.HULL ? C.hull : C.panel);
    const holes = (s.holes || []).slice().sort((p, q) => p.a0 - q.a0);
    const h = WALL_T / 2;

    const emit = (b0, b1, y0, y1) => {
      if (b1 - b0 < 0.001 || y1 - y0 < 0.001) return;
      let box, faceIn, faceOut;
      if (axis === 'x') {
        box = [b0, y0, at - h, b1, y1, at + h];
        faceIn = inSide > 0 ? 'pz' : 'nz'; faceOut = inSide > 0 ? 'nz' : 'pz';
      } else {
        box = [at - h, y0, b0, at + h, y1, b1];
        faceIn = inSide > 0 ? 'px' : 'nx'; faceOut = inSide > 0 ? 'nx' : 'px';
      }
      const faces = {}; faces[faceIn] = texIn; faces[faceOut] = texOut;
      const colors = {}; colors[faceIn] = colIn; colors[faceOut] = colOut;
      mb.box(box[0], box[1], box[2], box[3], box[4], box[5], TILE.PANEL, colIn,
        { faces: faces, colors: colors, uvScale: 0.34 });
      if (y0 < 1.9) this.solid(box[0], box[1], box[2], box[3], box[4], box[5]);
    };

    let cur = a0;
    for (const hole of holes) {
      const hy0 = hole.y0 === undefined ? 0 : hole.y0;
      const hy1 = hole.y1 === undefined ? 2.5 : hole.y1;
      if (hole.a0 > cur) emit(cur, hole.a0, WALL_Y0, WALL_Y1);
      emit(hole.a0, hole.a1, WALL_Y0, hy0);
      emit(hole.a0, hole.a1, hy1, WALL_Y1);
      cur = hole.a1;

      if (hole.type === 'window') this.makeWindow(mb, glass, axis, at, hole, hy0, hy1, s);
      else if (hole.type === 'door') this.makeDoor(mb, axis, at, hole, hy0, hy1, s);
    }
    if (cur < a1) emit(cur, a1, WALL_Y0, WALL_Y1);
  }

  makeWindow(mb, glass, axis, at, hole, hy0, hy1, s) {
    const h = WALL_T / 2;
    const w = hole.a1 - hole.a0;
    // szyba (dwustronna)
    const q = (x0, y0, z0, x1, y1, z1) => {
      const cA = colScale(C.glass, 0.75);
      if (axis === 'x') {
        glass.quad([x0, y0, at], [x1, y0, at], [x1, y1, at], [x0, y1, at], TILE.PLAIN, cA, { u: 1, v: 1 });
        glass.quad([x1, y0, at], [x0, y0, at], [x0, y1, at], [x1, y1, at], TILE.PLAIN, cA, { u: 1, v: 1 });
      } else {
        glass.quad([at, y0, z1], [at, y0, z0], [at, y1, z0], [at, y1, z1], TILE.PLAIN, cA, { u: 1, v: 1 });
        glass.quad([at, y0, z0], [at, y0, z1], [at, y1, z1], [at, y1, z0], TILE.PLAIN, cA, { u: 1, v: 1 });
      }
    };
    if (axis === 'x') q(hole.a0, hy0, 0, hole.a1, hy1, 0);
    else q(0, hy0, hole.a0, 0, hy1, hole.a1);

    // rama + szprosy
    const frame = (b0, b1, y0, y1) => {
      if (axis === 'x') mb.box(b0, y0, at - h - 0.03, b1, y1, at + h + 0.03, TILE.HULL, C.hullDark, { uvScale: 1 });
      else mb.box(at - h - 0.03, y0, b0, at + h + 0.03, y1, b1, TILE.HULL, C.hullDark, { uvScale: 1 });
    };
    frame(hole.a0 - 0.1, hole.a1 + 0.1, hy0 - 0.12, hy0);
    frame(hole.a0 - 0.1, hole.a1 + 0.1, hy1, hy1 + 0.12);
    frame(hole.a0 - 0.1, hole.a0, hy0, hy1);
    frame(hole.a1, hole.a1 + 0.1, hy0, hy1);
    const bars = Math.floor(w / 3.2);
    for (let i = 1; i <= bars; i++) {
      const p = hole.a0 + (w * i) / (bars + 1);
      frame(p - 0.07, p + 0.07, hy0, hy1);
    }
    // parapet
    if (hy0 > 0.6) {
      if (axis === 'x') mb.box(hole.a0 - 0.1, hy0 - 0.18, at - 0.4 * (s.inSide > 0 ? -1 : 1) - h, hole.a1 + 0.1, hy0 - 0.12, at + h, TILE.PANEL, C.panelWarm, { uvScale: 1 });
    }
  }

  makeDoor(mb, axis, at, hole, hy0, hy1, s) {
    const h = WALL_T / 2;
    const w = hole.a1 - hole.a0;
    const cx = (hole.a0 + hole.a1) / 2;
    const frame = (b0, b1, y0, y1) => {
      if (axis === 'x') mb.box(b0, y0, at - h - 0.06, b1, y1, at + h + 0.06, TILE.HULL, C.hullDark, { uvScale: 1 });
      else mb.box(at - h - 0.06, y0, b0, at + h + 0.06, y1, b1, TILE.HULL, C.hullDark, { uvScale: 1 });
    };
    frame(hole.a0 - 0.16, hole.a0, hy0, hy1 + 0.16);
    frame(hole.a1, hole.a1 + 0.16, hy0, hy1 + 0.16);
    frame(hole.a0 - 0.16, hole.a1 + 0.16, hy1, hy1 + 0.16);
    // pasek świetlny nad drzwiami
    if (axis === 'x') mb.box(cx - w / 2, hy1 + 0.17, at - h - 0.02, cx + w / 2, hy1 + 0.25, at + h + 0.02, TILE.LIGHT, C.accent, { emis: 1 });
    else mb.box(at - h - 0.02, hy1 + 0.17, cx - w / 2, at + h + 0.02, hy1 + 0.25, cx + w / 2, TILE.LIGHT, C.accent, { emis: 1 });

    const pos = axis === 'x' ? [cx, 0, at] : [at, 0, cx];
    this.doors.push({
      pos: pos,
      axis: axis,
      w: w, h: hy1,
      yaw: axis === 'x' ? 0 : Math.PI / 2,
      open: 0, target: 0, timer: 0,
      name: hole.name || 'Drzwi',
      outer: !!hole.outer
    });
  }

  buildWalls(mb, glass) {
    const W = (o) => this.wall(mb, glass, o);
    const win = (a0, a1, y0, y1) => ({ a0: a0, a1: a1, y0: y0 === undefined ? 1.05 : y0, y1: y1 === undefined ? 2.45 : y1, type: 'window' });
    const door = (c, w, name, outer) => ({ a0: c - w / 2, a1: c + w / 2, y0: 0, y1: 2.5, type: 'door', name: name, outer: outer });

    /* --- ściana północna korytarza (z = 2.2) --- */
    W({ axis: 'x', at: 2.2, a0: -24, a1: -16, inSide: -1, texOut: TILE.HULL, holes: [win(-22, -18)] });
    W({ axis: 'x', at: 2.2, a0: -16, a1: -4, inSide: -1, texOut: TILE.PANEL, colOut: C.panelWarm, holes: [door(-10, 2.2, 'Kuchnia')] });
    W({ axis: 'x', at: 2.2, a0: -4, a1: 2, inSide: -1, holes: [win(-3.2, 1.2)] });
    W({ axis: 'x', at: 2.2, a0: 2, a1: 16, inSide: -1, texOut: TILE.PANEL, holes: [door(9, 2.2, 'Salon widokowy')] });
    W({ axis: 'x', at: 2.2, a0: 16, a1: 18, inSide: -1, holes: [win(16.4, 17.6)] });
    W({ axis: 'x', at: 2.2, a0: 18, a1: 24, inSide: -1, texOut: TILE.PANEL, holes: [door(21, 2.2, 'Śluza')] });
    W({ axis: 'x', at: 2.2, a0: 24, a1: 26, inSide: -1, holes: [win(24.4, 25.6)] });

    /* --- ściana południowa korytarza (z = -2.2) --- */
    W({ axis: 'x', at: -2.2, a0: -24, a1: -16, inSide: 1, holes: [win(-22, -18)] });
    W({ axis: 'x', at: -2.2, a0: -16, a1: -4, inSide: 1, texOut: TILE.PANEL, colOut: C.panelWarm, holes: [door(-10, 2.2, 'Twoja kajuta')] });
    W({ axis: 'x', at: -2.2, a0: -4, a1: 2, inSide: 1, holes: [win(-3.2, 1.2)] });
    W({ axis: 'x', at: -2.2, a0: 2, a1: 16, inSide: 1, texOut: TILE.PANEL, holes: [door(9, 2.2, 'Oranżeria')] });
    W({ axis: 'x', at: -2.2, a0: 16, a1: 17, inSide: 1, holes: [] });
    W({ axis: 'x', at: -2.2, a0: 17, a1: 26, inSide: 1, texOut: TILE.PANEL, holes: [door(21, 2.2, 'Ładownia')] });

    /* --- kuchnia --- */
    W({ axis: 'z', at: -16, a0: 2.2, a1: 14, inSide: 1, holes: [win(4.5, 8.5)] });
    W({ axis: 'z', at: -4, a0: 2.2, a1: 14, inSide: -1, holes: [win(9.5, 13)] });
    W({ axis: 'x', at: 14, a0: -16, a1: -4, inSide: -1, holes: [win(-14, -10.5), win(-9, -5.5)] });

    /* --- salon widokowy --- */
    W({ axis: 'z', at: 2, a0: 2.2, a1: 14, inSide: 1, holes: [win(4, 8)] });
    W({ axis: 'z', at: 16, a0: 2.2, a1: 14, inSide: -1, holes: [win(4, 12.5)] });
    W({ axis: 'x', at: 14, a0: 2, a1: 16, inSide: -1, holes: [win(3.2, 14.8, 0.75, 2.75)] });

    /* --- śluza --- */
    W({ axis: 'z', at: 18, a0: 2.2, a1: 9, inSide: 1, holes: [] });
    W({ axis: 'z', at: 24, a0: 2.2, a1: 9, inSide: -1, holes: [win(4, 7.5)] });
    W({ axis: 'x', at: 9, a0: 18, a1: 24, inSide: -1, holes: [door(21, 2.2, 'Właz zewnętrzny', true), win(18.7, 19.7, 1.4, 2.3)] });

    /* --- kajuta --- */
    W({ axis: 'z', at: -16, a0: -14, a1: -2.2, inSide: 1, holes: [win(-12.5, -9)] });
    W({ axis: 'z', at: -4, a0: -14, a1: -2.2, inSide: -1, holes: [win(-13, -9.5)] });
    W({ axis: 'x', at: -14, a0: -16, a1: -4, inSide: 1, holes: [win(-14.5, -11), win(-8.5, -5)] });

    /* --- oranżeria --- */
    W({ axis: 'z', at: 2, a0: -14, a1: -2.2, inSide: 1, holes: [win(-12, -8)] });
    W({ axis: 'z', at: 16, a0: -14, a1: -2.2, inSide: -1, holes: [win(-12, -8)] });
    W({ axis: 'x', at: -14, a0: 2, a1: 16, inSide: 1, holes: [win(3.2, 8), win(9.5, 14.8)] });

    /* --- ładownia --- */
    W({ axis: 'z', at: 17, a0: -12, a1: -2.2, inSide: 1, holes: [] });
    W({ axis: 'x', at: -12, a0: 17, a1: 26, inSide: 1, holes: [win(19, 24)] });
    W({ axis: 'z', at: 26, a0: -12, a1: -7, inSide: -1, holes: [] });
    W({ axis: 'z', at: 26, a0: -7, a1: -2.2, inSide: -1, texOut: TILE.PANEL, holes: [] });

    /* --- maszynownia --- */
    W({ axis: 'z', at: -24, a0: -8, a1: -2.2, inSide: -1, holes: [win(-7, -3.5)] });
    W({ axis: 'z', at: -24, a0: -2.2, a1: 2.2, inSide: -1, texOut: TILE.PANEL, holes: [door(0, 2.2, 'Maszynownia')] });
    W({ axis: 'z', at: -24, a0: 2.2, a1: 8, inSide: -1, holes: [win(3.5, 7)] });
    W({ axis: 'z', at: -38, a0: -8, a1: 8, inSide: 1, holes: [win(-6, -2), win(2, 6)] });
    W({ axis: 'x', at: 8, a0: -38, a1: -24, inSide: -1, holes: [win(-35, -31)] });
    W({ axis: 'x', at: -8, a0: -38, a1: -24, inSide: 1, holes: [win(-35, -31)] });

    /* --- mostek --- */
    W({ axis: 'z', at: 26, a0: -2.2, a1: 2.2, inSide: 1, texOut: TILE.PANEL, holes: [door(0, 2.2, 'Mostek')] });
    W({ axis: 'z', at: 26, a0: 2.2, a1: 7, inSide: 1, holes: [win(3.2, 6.4)] });
    W({ axis: 'x', at: 7, a0: 26, a1: 40, inSide: -1, holes: [win(28, 32), win(33.5, 38.5)] });
    W({ axis: 'x', at: -7, a0: 26, a1: 40, inSide: 1, holes: [win(28, 32), win(33.5, 38.5)] });
    W({ axis: 'z', at: 40, a0: -7, a1: 7, inSide: -1, holes: [win(-6.2, 6.2, 0.7, 2.85)] });
  }

  /* --- elementy zewnętrzne: silniki, stateczniki, światła pozycyjne --- */
  buildHullExtras(mb) {
    const mbb = mb;
    // gondole silnikowe z tyłu
    for (const z of [-5.5, 5.5]) {
      mbb.box(-44, 0.2, z - 2.3, -37, 3.4, z + 2.3, TILE.RIDGE, C.hullDark, { uvScale: 0.4 });
      mbb.box(-46.4, 0.5, z - 1.9, -44, 3.1, z + 1.9, TILE.RIDGE, col(0x5b636d), { uvScale: 0.6 });
      // świecąca dysza
      mbb.box(-46.6, 0.7, z - 1.7, -46.4, 2.9, z + 1.7, TILE.LIGHT, col(0x76e0ff), { emis: 1 });
      this.light(-46, 1.8, z, col(0x50c8ff), 1.4);
    }
    // stateczniki
    for (const s of [-1, 1]) {
      mbb.box(-40, HULL_TOP, 6.4 * s - 0.4, -30, HULL_TOP + 4.2, 6.4 * s + 0.4, TILE.HULL, C.hullDark, { uvScale: 0.3 });
    }
    // dziób
    mbb.box(40, 0.4, -5.2, 43.4, 2.6, 5.2, TILE.HULL, C.hull, { uvScale: 0.35 });
    mbb.box(43.4, 0.9, -3.4, 45.2, 2.1, 3.4, TILE.HULL, C.hullDark, { uvScale: 0.5 });
    // antena
    mbb.cylinder(30, HULL_TOP, 0, 0.16, 4.5, 8, TILE.HULL, C.hullDark, {});
    mbb.sphere(30, HULL_TOP + 4.9, 0, 0.45, 8, TILE.LIGHT, col(0xff7a5c), { emis: 1 });
    // światła pozycyjne wzdłuż kadłuba
    for (let x = -34; x <= 38; x += 6) {
      for (const s of [-1, 1]) {
        const rect = this.rectAtX(x);
        if (!rect) continue;
        const z = s > 0 ? rect.z1 : rect.z0;
        mbb.boxAt(x, HULL_TOP + 0.12, z, 0.5, 0.16, 0.5, TILE.LIGHT, s > 0 ? col(0x66ff99) : col(0xff6666), { emis: 1 });
      }
    }
    // nogi do lądowania
    for (const p of [[-32, -6], [-32, 6], [-10, -10], [-10, 10], [10, -10], [10, 10], [34, -5], [34, 5]]) {
      mbb.cylinder(p[0], -1.05, p[1], 0.24, 0.55, 8, TILE.RIDGE, C.hullDark, {});
      mbb.cylinder(p[0], -1.14, p[1], 0.62, 0.14, 10, TILE.HULL, col(0x5b636d), {});
    }

    // podest i schodki przed włazem śluzy (z = 9)
    mbb.box(19.5, -0.62, 8.6, 22.5, -0.5, 9.4, TILE.GRATE, C.grate, { uvScale: 0.8 });
    this.solid(19.5, -1.4, 8.6, 22.5, -0.5, 9.4);
    const steps = [[9.4, 10.0, -0.28], [10.0, 10.6, -0.56], [10.6, 11.4, -0.85]];
    for (const s of steps) {
      mbb.box(19.7, -1.5, s[0], 22.3, s[2], s[1], TILE.GRATE, colScale(C.grate, 0.95), { uvScale: 0.7 });
      this.solid(19.7, -1.5, s[0], 22.3, s[2], s[1]);
    }
    for (const x of [19.6, 22.4]) {
      mbb.box(x - 0.06, -0.5, 8.7, x + 0.06, 0.55, 11.3, TILE.HULL, C.hullDark, { uvScale: 1 });
    }

    // panele słoneczne / radiatory na dachu
    for (const s of [-1, 1]) {
      mbb.box(-16, HULL_TOP + 0.05, 9 * s - 1.6, -6, HULL_TOP + 0.15, 9 * s + 1.6, TILE.PLAIN, col(0x2b3550), { uvScale: 1 });
      mbb.box(4, HULL_TOP + 0.05, 9 * s - 1.6, 14, HULL_TOP + 0.15, 9 * s + 1.6, TILE.PLAIN, col(0x2b3550), { uvScale: 1 });
    }
  }

  rectAtX(x) {
    let best = null;
    for (const r of RECTS) {
      if (x >= r.x0 && x <= r.x1) {
        if (!best || (r.z1 - r.z0) > (best.z1 - best.z0)) best = r;
      }
    }
    return best;
  }

  /* ====================== WYPOSAŻENIE ====================== */
  buildFurniture(mb) {
    this.furnCorridor(mb);
    this.furnGalley(mb);
    this.furnLounge(mb);
    this.furnQuarters(mb);
    this.furnGreenhouse(mb);
    this.furnCargo(mb);
    this.furnEngine(mb);
    this.furnAirlock(mb);
    this.furnBridge(mb);
  }

  furnCorridor(mb) {
    // pasy świetlne i rury wzdłuż korytarza
    for (const s of [-1, 1]) {
      mb.box(-24, 2.55, 2.0 * s - 0.06, 26, 2.62, 2.0 * s + 0.06, TILE.LIGHT, C.accent, { emis: 0.8 });
      mb.box(-24, 0.02, 2.05 * s - 0.05, 26, 0.14, 2.05 * s + 0.05, TILE.LIGHT, col(0xffe6a8), { emis: 0.6 });
    }
    for (let x = -22; x < 26; x += 8) {
      mb.cylinder(x, 0, 1.9, 0.1, CEIL_Y, 8, TILE.HULL, C.hullDark, { noCap: true });
      mb.box(x - 0.6, 1.2, 1.98, x + 0.6, 1.9, 2.06, TILE.PANEL, col(0xdfe6ee), { uvScale: 1 });
      mb.box(x - 0.5, 1.35, 2.06, x + 0.5, 1.75, 2.1, TILE.LIGHT, col(0x9fe8ff), { emis: 0.7 });
    }
    // roślinki w korytarzu
    for (const x of [-19, 5, 17]) {
      this.pot(mb, x, -1.6, 0.55);
    }
  }

  pot(mb, x, z, s) {
    mb.transform(x, 0, z, Math.random() * 6, s);
    mb.cylinder(0, 0, 0, 0.45, 0.5, 10, TILE.PANEL, col(0xd8a07a), { rTop: 0.55 });
    mb.cylinder(0, 0.5, 0, 0.5, 0.12, 10, TILE.SOIL, col(0x9c7a55), {});
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      mb.transform(x + Math.cos(a) * 0.18 * s, 0.6 * s, z + Math.sin(a) * 0.18 * s, a, s);
      mb.cross(0, 0, 0, 0.8, 1.0 + (i % 3) * 0.25, TILE.LEAF, colMix(col(0x6fbf5a), col(0x3f8f4a), (i % 3) / 2), {});
    }
    mb.resetTransform();
    this.solid(x - 0.5 * s, 0, z - 0.5 * s, x + 0.5 * s, 0.6 * s, z + 0.5 * s);
  }

  furnGalley(mb) {
    const counter = (x0, z0, x1, z1) => {
      mb.box(x0, 0, z0, x1, 0.85, z1, TILE.PANEL, col(0xe9dfd0), { uvScale: 0.5 });
      mb.box(x0 - 0.04, 0.85, z0 - 0.04, x1 + 0.04, 0.95, z1 + 0.04, TILE.PLAIN, col(0x4b4f57), { uvScale: 1 });
      this.solid(x0, 0, z0, x1, 0.95, z1);
    };
    // blat wzdłuż zachodniej ściany (zaczyna się za lodówką)
    counter(-15.6, 4.4, -14.0, 12.0);
    // zlew
    mb.box(-15.3, 0.86, 5.4, -14.3, 0.96, 6.8, TILE.PLAIN, col(0x9aa3ad), { uvScale: 1 });
    mb.cylinder(-15.2, 0.95, 6.1, 0.05, 0.45, 6, TILE.PLAIN, col(0xc8ccd2), {});
    // kuchenka z garnkami
    mb.box(-15.4, 0.86, 8.2, -14.2, 0.94, 9.8, TILE.PLAIN, col(0x2e3238), { uvScale: 1 });
    for (const p of [[-15.0, 8.6], [-14.5, 9.4]]) {
      mb.cylinder(p[0], 0.94, p[1], 0.28, 0.26, 10, TILE.PLAIN, col(0xb9c2cb), {});
      mb.cylinder(p[0], 1.2, p[1], 0.3, 0.04, 10, TILE.PLAIN, col(0x8d959e), {});
    }
    this.addInteract('stove', -14.8, 1.2, 9.0, 2.2, 'Ugotuj coś dobrego');
    this.light(-14.8, 1.6, 9.0, col(0xffb070), 0.5);

    // lodówka
    mb.box(-15.6, 0, 2.6, -14.2, 2.1, 4.0, TILE.PANEL, col(0xd6dde4), { uvScale: 0.6 });
    mb.box(-14.18, 0.2, 2.8, -14.12, 1.9, 3.8, TILE.PLAIN, col(0x8f98a2), { uvScale: 1 });
    this.solid(-15.6, 0, 2.6, -14.2, 2.1, 4.0);
    this.addInteract('fridge', -14.0, 1.2, 3.3, 2.0, 'Zajrzyj do lodówki');

    // ekspres do kawy
    mb.box(-15.2, 0.95, 10.4, -14.5, 1.55, 11.2, TILE.PANEL, col(0x4d5560), { uvScale: 1 });
    mb.box(-15.15, 1.55, 10.5, -14.55, 1.62, 11.1, TILE.LIGHT, col(0xffc98a), { emis: 0.8 });
    this.addInteract('coffee', -14.3, 1.3, 10.8, 2.0, 'Zaparz kawę');

    // stół i krzesła
    const tx = -9.5, tz = 7.5;
    mb.box(tx - 1.6, 0.72, tz - 1.0, tx + 1.6, 0.82, tz + 1.0, TILE.WOOD, C.white, { uvScale: 0.6 });
    for (const dx of [-1.4, 1.4]) for (const dz of [-0.8, 0.8])
      mb.box(tx + dx - 0.08, 0, tz + dz - 0.08, tx + dx + 0.08, 0.72, tz + dz + 0.08, TILE.WOOD, col(0xd8b48c), { uvScale: 1 });
    this.solid(tx - 1.6, 0, tz - 1.0, tx + 1.6, 0.82, tz + 1.0);
    const chair = (cx, cz, yaw) => {
      mb.transform(cx, 0, cz, yaw, 1);
      mb.box(-0.28, 0.42, -0.28, 0.28, 0.5, 0.28, TILE.WOOD, col(0xe8c9a0), { uvScale: 1 });
      mb.box(-0.28, 0.5, -0.3, 0.28, 1.05, -0.22, TILE.WOOD, col(0xe8c9a0), { uvScale: 1 });
      for (const dx of [-0.22, 0.22]) for (const dz of [-0.22, 0.22])
        mb.box(dx - 0.04, 0, dz - 0.04, dx + 0.04, 0.42, dz + 0.04, TILE.WOOD, col(0xc9a578), { uvScale: 1 });
      mb.resetTransform();
      this.solid(cx - 0.3, 0, cz - 0.3, cx + 0.3, 0.5, cz + 0.3);
    };
    chair(tx - 2.3, tz, Math.PI / 2); chair(tx + 2.3, tz, -Math.PI / 2);
    chair(tx, tz - 1.7, 0); chair(tx, tz + 1.7, Math.PI);
    // lampa nad stołem
    mb.cylinder(tx, 2.3, tz, 0.06, 0.9, 6, TILE.PLAIN, C.dark, { noCap: true });
    mb.cylinder(tx, 1.95, tz, 0.55, 0.35, 12, TILE.PANEL, col(0xffd9a0), { rTop: 0.18, noCap: true });
    mb.cylinder(tx, 1.93, tz, 0.5, 0.04, 12, TILE.LIGHT, col(0xffe6b8), { emis: 1 });
    this.light(tx, 1.7, tz, col(0xffcf95), 1.2);

    // półki z zapasami
    for (let i = 0; i < 3; i++) {
      const y = 1.3 + i * 0.55;
      mb.box(-6.2, y, 3.2, -4.3, y + 0.08, 8.2, TILE.WOOD, col(0xe0bb92), { uvScale: 0.7 });
      const rnd = mulberry(1000 + i);
      for (let k = 0; k < 9; k++) {
        const z = 3.5 + rnd() * 4.4;
        const hgt = 0.2 + rnd() * 0.22;
        mb.cylinder(-5.2 + (rnd() - 0.5) * 1.2, y + 0.08, z, 0.1 + rnd() * 0.06, hgt, 8, TILE.PLAIN,
          [0.5 + rnd() * 0.5, 0.5 + rnd() * 0.4, 0.4 + rnd() * 0.5], {});
      }
    }
    this.light(-10, 2.4, 11, col(0xffd6a5), 0.7);
  }

  furnLounge(mb) {
    // kanapa przy panoramicznym oknie
    const sofa = (cx, cz, yaw) => {
      mb.transform(cx, 0, cz, yaw, 1);
      mb.box(-1.8, 0.15, -0.5, 1.8, 0.55, 0.5, TILE.CARPET, col(0xe0a9a0), { uvScale: 0.8 });
      mb.box(-1.8, 0.55, -0.5, 1.8, 1.15, -0.25, TILE.CARPET, col(0xd89a92), { uvScale: 0.8 });
      mb.box(-1.95, 0.15, -0.5, -1.75, 0.9, 0.5, TILE.CARPET, col(0xd89a92), { uvScale: 1 });
      mb.box(1.75, 0.15, -0.5, 1.95, 0.9, 0.5, TILE.CARPET, col(0xd89a92), { uvScale: 1 });
      for (const dx of [-1.6, 1.6]) for (const dz of [-0.35, 0.35])
        mb.box(dx - 0.07, 0, dz - 0.07, dx + 0.07, 0.15, dz + 0.07, TILE.WOOD, col(0xc9a578), { uvScale: 1 });
      // poduszki
      for (const dx of [-1.1, 0.9]) mb.box(dx - 0.28, 0.55, -0.24, dx + 0.28, 1.05, -0.05, TILE.CARPET, col(0xf3d9a8), { uvScale: 1 });
      mb.resetTransform();
      this.solid(cx - 2, 0, cz - 0.6, cx + 2, 0.9, cz + 0.6);
    };
    sofa(9, 11.6, Math.PI);
    sofa(4.2, 8.2, -Math.PI / 2);

    // dywan i stolik
    mb.plane(6.4, 8.6, 11.6, 12.4, 0.02, TILE.CARPET, col(0xa88fd0), { uvScale: 0.4 });
    mb.box(8.2, 0.35, 9.6, 10.2, 0.45, 11.0, TILE.WOOD, C.white, { uvScale: 0.8 });
    for (const dx of [8.4, 10.0]) for (const dz of [9.8, 10.8])
      mb.box(dx - 0.06, 0, dz - 0.06, dx + 0.06, 0.35, dz + 0.06, TILE.WOOD, col(0xc9a578), { uvScale: 1 });
    mb.cylinder(9.2, 0.45, 10.4, 0.12, 0.18, 8, TILE.PLAIN, col(0xffffff), {});
    this.solid(8.2, 0, 9.6, 10.2, 0.45, 11.0);

    // regał z książkami
    mb.box(14.6, 0, 3.4, 15.6, 2.4, 7.4, TILE.WOOD, col(0xd8b087), { uvScale: 0.5 });
    this.solid(14.6, 0, 3.4, 15.6, 2.4, 7.4);
    const rnd = mulberry(77);
    for (let s = 0; s < 4; s++) {
      const y = 0.35 + s * 0.55;
      for (let i = 0; i < 22; i++) {
        const z = 3.6 + i * 0.16 + rnd() * 0.03;
        if (z > 7.2) break;
        mb.box(14.75, y, z, 15.5, y + 0.24 + rnd() * 0.14, z + 0.12, TILE.PLAIN,
          [0.35 + rnd() * 0.6, 0.35 + rnd() * 0.5, 0.35 + rnd() * 0.6], { uvScale: 1 });
      }
    }

    // odtwarzacz muzyki
    mb.box(14.7, 2.4, 4.4, 15.5, 2.75, 5.6, TILE.PANEL, col(0x51596a), { uvScale: 1 });
    mb.box(14.68, 2.5, 4.6, 14.72, 2.68, 5.4, TILE.LIGHT, col(0x8ff0d0), { emis: 1 });
    this.addInteract('music', 14.2, 2.5, 5.0, 2.2, 'Włącz / wyłącz muzykę');

    // teleskop przy oknie – trójnóg pod głowicą, luneta przechylona ku szybie
    const teX = 12.6, teZ = 11.9;
    mb.transform(teX, 0, teZ, -0.6, 1);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      mb.box(Math.cos(a) * 0.5 - 0.05, 0, Math.sin(a) * 0.5 - 0.05, Math.cos(a) * 0.5 + 0.05, 1.15, Math.sin(a) * 0.5 + 0.05, TILE.PLAIN, C.dark, { uvScale: 1 });
    }
    mb.cylinder(0, 1.15, 0, 0.2, 0.16, 10, TILE.PLAIN, col(0x6a7280), {});
    mb.resetTransform();
    // luneta: rura przechylona w górę i w stronę okna (+z), z lunetą-celownikiem i soczewką
    mb.beam(teX, 1.28, teZ, 0.12, 0.55, 0.83, 1.35, 0.30, 0.30, TILE.PLAIN, col(0x2f3a4a), {});
    mb.beam(teX + 0.12 * 1.32, 1.28 + 0.55 * 1.32, teZ + 0.83 * 1.32, 0.12, 0.55, 0.83, 0.14, 0.34, 0.34, TILE.PLAIN, col(0x1f2831), {});
    mb.beam(teX + 0.12 * 0.35, 1.28 + 0.55 * 0.35 + 0.22, teZ + 0.83 * 0.35, 0.12, 0.55, 0.83, 0.55, 0.09, 0.09, TILE.PLAIN, col(0x3a4451), {});
    this.addInteract('telescope', teX, 1.5, teZ - 0.6, 2.2, 'Popatrz przez teleskop');
    this.solid(teX - 0.6, 0, teZ - 0.6, teX + 0.6, 1.2, teZ + 0.6);

    // rośliny i lampy nastrojowe
    this.pot(mb, 3.2, 12.6, 0.9);
    this.pot(mb, 15.0, 12.4, 0.75);
    for (const p of [[5.5, 4.2], [13.0, 9.0]]) {
      mb.cylinder(p[0], 0, p[1], 0.18, 1.5, 8, TILE.PLAIN, col(0x50586a), {});
      mb.cylinder(p[0], 1.5, p[1], 0.3, 0.45, 10, TILE.PANEL, col(0xffe0b0), { rTop: 0.42, noCap: true });
      mb.cylinder(p[0], 1.5, p[1], 0.28, 0.05, 10, TILE.LIGHT, col(0xffd9a0), { emis: 1 });
      this.light(p[0], 1.7, p[1], col(0xffc98a), 1.0);
    }
    // ławka pod oknem
    mb.box(3.4, 0, 13.0, 8.0, 0.5, 13.8, TILE.CARPET, col(0xc7b2e6), { uvScale: 0.7 });
    this.solid(3.4, 0, 13.0, 8.0, 0.5, 13.8);
  }

  furnQuarters(mb) {
    // łóżko
    mb.box(-15.4, 0.15, -13.4, -12.6, 0.55, -10.6, TILE.WOOD, col(0xd8b087), { uvScale: 0.6 });
    mb.box(-15.3, 0.55, -13.3, -12.7, 0.85, -10.7, TILE.CARPET, col(0xeef0f6), { uvScale: 0.6 });
    mb.box(-15.3, 0.85, -13.3, -13.9, 1.0, -12.2, TILE.CARPET, C.white, { uvScale: 1 });
    mb.box(-15.35, 0.55, -13.45, -15.15, 1.6, -10.55, TILE.WOOD, col(0xc9a578), { uvScale: 1 });
    this.solid(-15.4, 0, -13.4, -12.6, 0.85, -10.6);
    this.addInteract('bed', -12.2, 0.8, -12.0, 2.2, 'Odpocznij');

    // biurko z monitorem
    mb.box(-15.5, 0.7, -8.6, -13.6, 0.8, -6.4, TILE.WOOD, C.white, { uvScale: 0.7 });
    for (const dz of [-8.3, -6.7]) mb.box(-15.4, 0, dz - 0.06, -15.2, 0.7, dz + 0.06, TILE.PLAIN, C.dark, { uvScale: 1 });
    for (const dz of [-8.3, -6.7]) mb.box(-13.9, 0, dz - 0.06, -13.7, 0.7, dz + 0.06, TILE.PLAIN, C.dark, { uvScale: 1 });
    mb.box(-15.1, 0.8, -7.9, -15.0, 1.55, -6.9, TILE.PLAIN, C.dark, { uvScale: 1 });
    mb.box(-15.0, 0.95, -8.0, -14.94, 1.75, -6.8, TILE.LIGHT, col(0x8fd8ff), { emis: 0.9 });
    this.light(-14.6, 1.4, -7.4, col(0x86c8ff), 0.7);
    this.solid(-15.5, 0, -8.6, -13.6, 0.8, -6.4);
    this.addInteract('desk', -13.2, 1.2, -7.4, 2.0, 'Sprawdź dziennik pokładowy');

    // szafa
    mb.box(-5.6, 0, -13.6, -4.3, 2.3, -11.2, TILE.WOOD, col(0xcaa273), { uvScale: 0.5 });
    mb.box(-4.28, 0.2, -13.4, -4.24, 2.1, -12.42, TILE.PLAIN, col(0x8f7a5e), { uvScale: 1 });
    mb.box(-4.28, 0.2, -12.38, -4.24, 2.1, -11.4, TILE.PLAIN, col(0x8f7a5e), { uvScale: 1 });
    this.solid(-5.6, 0, -13.6, -4.3, 2.3, -11.2);

    // dywan, lampka, roślina
    mb.plane(-12.0, -11.0, -7.0, -6.0, 0.02, TILE.CARPET, col(0xe8c9a0), { uvScale: 0.4 });
    this.pot(mb, -5.2, -8.0, 1.0);
    mb.cylinder(-12.3, 0, -13.2, 0.16, 1.3, 8, TILE.PLAIN, col(0x6a5a4a), {});
    mb.cylinder(-12.3, 1.3, -13.2, 0.26, 0.4, 10, TILE.PANEL, col(0xffe0b0), { rTop: 0.36, noCap: true });
    mb.cylinder(-12.3, 1.32, -13.2, 0.24, 0.05, 10, TILE.LIGHT, col(0xffd9a0), { emis: 1 });
    this.light(-12.3, 1.5, -13.2, col(0xffbe80), 1.1);

    // strefa budowania – oznaczona podłoga
    const bz = rectById('quarters');
    mb.plane(-12.0, -6.0, -5.0, -3.0, 0.03, TILE.PLAIN, col(0x6fd8e8), { uvScale: 1, emis: 0.25 });
    mb.plane(-11.88, -5.88, -5.12, -3.12, 0.06, TILE.CARPET, col(0xd8c2ad), { uvScale: 0.5 });
    this.addInteract('buildzone', -8.5, 1.0, -4.5, 3.0, 'Strefa budowy – wciśnij [B]');
  }

  furnGreenhouse(mb) {
    // grządki
    const bed = (x0, z0, x1, z1, seed) => {
      mb.box(x0, 0, z0, x1, 0.55, z1, TILE.WOOD, col(0xc9a071), { uvScale: 0.6 });
      mb.box(x0 + 0.12, 0.5, z0 + 0.12, x1 - 0.12, 0.62, z1 - 0.12, TILE.SOIL, col(0xa08160), { uvScale: 0.6 });
      this.solid(x0, 0, z0, x1, 0.62, z1);
      const rnd = mulberry(seed);
      for (let i = 0; i < 26; i++) {
        const px = lerp(x0 + 0.4, x1 - 0.4, rnd());
        const pz = lerp(z0 + 0.4, z1 - 0.4, rnd());
        const h = 0.4 + rnd() * 0.9;
        mb.transform(px, 0.62, pz, rnd() * 6, 1);
        mb.cylinder(0, 0, 0, 0.045, h * 0.5, 5, TILE.LEAF, col(0x6a9c4a), {});
        mb.cross(0, h * 0.35, 0, 0.55 + rnd() * 0.3, h, TILE.LEAF, colMix(col(0x88d05f), col(0x3f8f4a), rnd()), {});
        if (rnd() < 0.35) mb.sphere(0, h * 0.9, 0, 0.12, 6, TILE.PLAIN, rnd() < 0.5 ? col(0xff7f6a) : col(0xffd166), {});
        mb.resetTransform();
      }
    };
    bed(3.0, -13.2, 6.4, -3.4, 11);
    bed(7.4, -13.2, 10.8, -3.4, 22);
    bed(11.8, -13.2, 15.2, -8.0, 33);

    // lampy do uprawy
    for (let z = -12; z <= -4; z += 4) {
      for (const x of [4.7, 9.1]) {
        mb.box(x - 1.4, 2.55, z - 0.25, x + 1.4, 2.7, z + 0.25, TILE.PLAIN, C.dark, { uvScale: 1 });
        mb.box(x - 1.3, 2.45, z - 0.2, x + 1.3, 2.55, z + 0.2, TILE.LIGHT, col(0xff9ee8), { emis: 1 });
        this.light(x, 2.3, z, col(0xff86e0), 0.75);
      }
    }
    // zbiornik z wodą
    mb.cylinder(14.2, 0, -5.6, 0.9, 2.0, 14, TILE.PANEL, col(0xa8d8e8), {});
    mb.cylinder(14.2, 2.0, -5.6, 0.95, 0.12, 14, TILE.PLAIN, col(0x5a6a78), {});
    this.solid(13.2, 0, -6.6, 15.2, 2.0, -4.6);
    this.addInteract('water', 12.6, 1.2, -5.6, 2.4, 'Podlej rośliny');
    // duże drzewko (poza grządkami)
    mb.transform(12.0, 0, -5.0, 0.4, 1.0);
    mb.cylinder(0, 0, 0, 0.28, 2.0, 8, TILE.WOOD, col(0x8a6a4a), { rTop: 0.2 });
    mb.sphere(0, 2.3, 0, 1.05, 8, TILE.LEAF, col(0x7fc45f), { squash: 0.85 });
    mb.sphere(0.6, 1.9, 0.4, 0.7, 7, TILE.LEAF, col(0x6fb352), {});
    mb.resetTransform();
    this.solid(11.6, 0, -5.4, 12.4, 2.0, -4.6);
  }

  furnCargo(mb) {
    const rnd = mulberry(404);
    const crate = (x, y, z, s, c) => {
      mb.transform(x, y, z, 0, 1);
      mb.box(-s / 2, 0, -s / 2, s / 2, s, s / 2, TILE.PANEL, c, { uvScale: 0.9 });
      mb.box(-s / 2 - 0.03, s * 0.42, -s / 2 - 0.03, s / 2 + 0.03, s * 0.5, s / 2 + 0.03, TILE.PLAIN, col(0x5b636d), { uvScale: 1 });
      mb.resetTransform();
      this.solid(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2);
    };
    const cols = [col(0xd9a05b), col(0x7fb6d9), col(0xb0b8c2), col(0xd98f8f)];
    crate(19.2, 0, -10.6, 1.2, cols[0]); crate(19.2, 1.2, -10.6, 1.2, cols[1]);
    crate(20.6, 0, -10.6, 1.2, cols[2]); crate(19.2, 0, -9.2, 1.2, cols[3]);
    crate(24.4, 0, -10.8, 1.5, cols[1]); crate(24.4, 1.5, -10.8, 1.0, cols[0]);
    crate(19.1, 0, -7.2, 1.3, cols[2]);
    // beczki (z dala od wejścia, żeby go nie blokować)
    for (let i = 0; i < 4; i++) {
      const x = 21.0 + i * 0.95, z = -8.6;
      mb.cylinder(x, 0, z, 0.42, 1.1, 10, TILE.RIDGE, i % 2 ? col(0xd9c05b) : col(0x88c0a8), {});
      this.solid(x - 0.45, 0, z - 0.45, x + 0.45, 1.1, z + 0.45);
    }
    // stół warsztatowy + drukarka 3D
    mb.box(21.6, 0.8, -6.2, 25.4, 0.92, -4.6, TILE.PANEL, col(0xbfc6cf), { uvScale: 0.6 });
    for (const dx of [21.8, 25.2]) for (const dz of [-6.0, -4.8])
      mb.box(dx - 0.07, 0, dz - 0.07, dx + 0.07, 0.8, dz + 0.07, TILE.PLAIN, C.dark, { uvScale: 1 });
    this.solid(21.6, 0, -6.2, 25.4, 0.92, -4.6);
    mb.box(22.0, 0.92, -6.0, 23.6, 2.3, -4.8, TILE.PANEL, col(0x5b6572), { uvScale: 0.8 });
    mb.box(22.1, 1.05, -6.05, 23.5, 2.1, -6.02, TILE.LIGHT, col(0x5fc0a0), { emis: 0.42 });
    this.light(22.8, 1.6, -5.4, col(0x88ffcc), 0.6);
    this.addInteract('printer', 22.8, 1.3, -6.9, 2.4, 'Drukarka modułów – wciśnij [B]');
    // narzędzia na ścianie (zachodniej, pełnej – z dala od okien i niszy kapsuł)
    for (let i = 0; i < 6; i++) {
      const z = -11.4 + i * 0.5;
      mb.box(17.05, 1.4, z, 17.2, 1.4 + 0.35 + (i % 3) * 0.15, z + 0.14, TILE.PLAIN, col(0x8fa0b0), { uvScale: 1 });
    }

    // kołyski po kapsułach ratunkowych (ściana wschodnia, x = 26)
    this.podSlots = [];
    for (let i = 0; i < 4; i++) {
      const z = -11.0 + i * 2.1;
      // wnęka (bez ściany od strony pokoju, żeby było widać wnętrze i kapsułę)
      mb.box(25.4, 0.25, z - 0.85, 25.88, 2.35, z + 0.85, TILE.RIDGE, col(0x4a5058), { uvScale: 0.6, skip: { nx: true } });
      // obręcz właz
      const seg = 14, R = 0.78;
      for (let k = 0; k < seg; k++) {
        const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2;
        mb.quad(
          [25.36, 1.3 + Math.sin(a1) * (R + 0.13), z + Math.cos(a1) * (R + 0.13)],
          [25.36, 1.3 + Math.sin(a0) * (R + 0.13), z + Math.cos(a0) * (R + 0.13)],
          [25.36, 1.3 + Math.sin(a0) * R, z + Math.cos(a0) * R],
          [25.36, 1.3 + Math.sin(a1) * R, z + Math.cos(a1) * R],
          TILE.HULL, col(0x7a828c), { uvScale: 1 });
      }
      // pusty otwór – ciemność w środku
      mb.box(25.86, 0.55, z - 0.78, 25.9, 2.05, z + 0.78, TILE.PLAIN, col(0x0b0e12), { uvScale: 1 });
      // lampka statusu – zgaszona / czerwona
      mb.box(25.3, 2.05, z - 0.2, 25.36, 2.2, z + 0.2, TILE.LIGHT, col(0xd04a3a), { emis: 0.5 });
      mb.box(25.3, 0.6, z - 0.5, 25.36, 0.72, z + 0.5, TILE.PLAIN, col(0xffd166), { uvScale: 1 });
      this.solid(25.3, 0, z - 0.9, 26.0, 2.4, z + 0.9);
      this.podSlots.push({ pos: [25.55, 1.3, z] });
    }
    this.addInteract('pods', 24.6, 1.3, -7.0, 3.0, 'Kapsuły ratunkowe');
  }

  furnEngine(mb) {
    // rdzeń reaktora (pulsuje – rysowany osobno)
    this.reactor = { pos: [-31, 0.2, 0], r: 1.5 };
    mb.cylinder(-31, 0, 0, 2.0, 0.35, 14, TILE.RIDGE, col(0x6b737d), {});
    mb.cylinder(-31, 2.9, 0, 2.0, 0.3, 14, TILE.RIDGE, col(0x6b737d), {});
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      mb.box(-31 + Math.cos(a) * 1.85 - 0.1, 0.35, Math.sin(a) * 1.85 - 0.1, -31 + Math.cos(a) * 1.85 + 0.1, 2.9, Math.sin(a) * 1.85 + 0.1, TILE.HULL, col(0x8b939d), { uvScale: 1 });
    }
    this.solid(-33, 0, -2, -29, 2.9, 2);
    this.light(-31, 1.6, 0, col(0x66d0ff), 1.6);
    this.addInteract('reactor', -28.6, 1.4, 0, 2.6, 'Sprawdź reaktor');

    // rury i konsole
    for (const s of [-1, 1]) {
      mb.box(-37.6, 2.2, 5.4 * s - 0.22, -24.6, 2.5, 5.4 * s + 0.22, TILE.RIDGE, col(0x77808c), { uvScale: 0.5 });
      mb.box(-37.6, 1.7, 5.9 * s - 0.16, -24.6, 1.9, 5.9 * s + 0.16, TILE.RIDGE, col(0x9aa3ad), { uvScale: 0.5 });
      for (let x = -36; x < -25; x += 3.4) {
        mb.box(x - 0.25, 0, 7.2 * s - 0.3, x + 0.25, 2.2, 7.2 * s + 0.3, TILE.RIDGE, col(0x69727c), { uvScale: 0.7 });
      }
    }
    for (const z of [-6.4, 6.4]) {
      mb.box(-27.2, 0, z - 1.2, -26.2, 1.1, z + 1.2, TILE.PANEL, col(0x5c6470), { uvScale: 0.8 });
      mb.box(-27.25, 1.1, z - 1.1, -26.3, 1.5, z + 1.1, TILE.LIGHT, col(0x9fe0ff), { emis: 0.8 });
      this.solid(-27.2, 0, z - 1.2, -26.2, 1.5, z + 1.2);
      this.light(-26.8, 1.7, z, col(0x77c8ff), 0.6);
    }
    // zbiorniki paliwa
    for (const z of [-3.5, 3.5]) {
      mb.cylinder(-35.6, 0, z, 1.2, 2.6, 12, TILE.RIDGE, col(0xa9b2bc), {});
      this.solid(-36.8, 0, z - 1.2, -34.4, 2.6, z + 1.2);
    }
  }

  furnAirlock(mb) {
    // szafki na skafandry
    for (let i = 0; i < 3; i++) {
      const z = 3.2 + i * 1.5;
      mb.box(18.2, 0, z, 19.0, 2.2, z + 1.2, TILE.PANEL, col(0x99a3ae), { uvScale: 0.7 });
      mb.box(19.0, 0.15, z + 0.1, 19.05, 2.05, z + 1.1, TILE.PLAIN, col(0x6a737d), { uvScale: 1 });
      this.solid(18.2, 0, z, 19.0, 2.2, z + 1.2);
    }
    // skafander na stojaku
    mb.transform(22.6, 0, 4.0, -0.6, 1);
    mb.cylinder(0, 0, 0, 0.4, 1.1, 8, TILE.PANEL, C.white, {});
    mb.box(-0.42, 1.1, -0.3, 0.42, 1.75, 0.3, TILE.PANEL, col(0xf0f2f6), { uvScale: 1 });
    mb.sphere(0, 2.0, 0, 0.33, 10, TILE.PANEL, col(0xdfe6ee), {});
    mb.box(-0.24, 1.9, 0.18, 0.24, 2.12, 0.36, TILE.LIGHT, col(0x86d8ff), { emis: 0.5 });
    mb.resetTransform();
    this.solid(22.2, 0, 3.6, 23.0, 2.2, 4.4);
    // panel sterowania śluzą
    mb.box(23.42, 1.1, 7.4, 23.84, 1.9, 8.6, TILE.PANEL, col(0x4f5865), { uvScale: 1 });
    mb.box(23.37, 1.2, 7.5, 23.42, 1.8, 8.5, TILE.LIGHT, col(0xffb765), { emis: 1 });
    this.light(23.2, 1.8, 8.0, col(0xffa860), 0.7);
    this.addInteract('airlock', 22.9, 1.5, 8.0, 2.4, 'Panel śluzy');
    // ostrzegawcze pasy na podłodze
    for (let i = 0; i < 6; i++)
      mb.plane(19.3 + i * 0.55, 8.0, 19.6 + i * 0.55, 8.7, 0.02, TILE.PLAIN, i % 2 ? col(0xffd166) : col(0x33383f), { uvScale: 1 });
  }

  furnBridge(mb) {
    // fotel pilota
    mb.transform(33.0, 0, 0, 0, 1.15);
    mb.cylinder(0, 0, 0, 0.45, 0.25, 10, TILE.PLAIN, col(0x4a525e), {});
    mb.cylinder(0, 0.25, 0, 0.16, 0.35, 8, TILE.PLAIN, col(0x6a737d), {});
    mb.box(-0.5, 0.6, -0.5, 0.5, 0.75, 0.5, TILE.CARPET, col(0xd0a8a0), { uvScale: 1 });
    mb.box(-0.5, 0.75, -0.62, 0.5, 1.75, -0.44, TILE.CARPET, col(0xc89a92), { uvScale: 1 });
    mb.box(-0.62, 0.75, -0.5, -0.44, 1.1, 0.3, TILE.CARPET, col(0xc89a92), { uvScale: 1 });
    mb.box(0.44, 0.75, -0.5, 0.62, 1.1, 0.3, TILE.CARPET, col(0xc89a92), { uvScale: 1 });
    mb.resetTransform();
    this.solid(32.3, 0, -0.7, 33.7, 0.75, 0.7);

    // pulpit nawigacyjny
    mb.box(34.6, 0.55, -2.6, 36.6, 1.05, 2.6, TILE.PANEL, col(0x4b5462), { uvScale: 0.6 });
    mb.box(34.6, 1.05, -2.6, 35.9, 1.12, 2.6, TILE.LIGHT, col(0x6fb8d8), { emis: 0.4 });
    mb.box(36.6, 0.9, -2.4, 36.75, 2.0, 2.4, TILE.PANEL, col(0x3d4552), { uvScale: 0.7 });
    mb.box(36.55, 1.0, -2.3, 36.6, 1.95, 2.3, TILE.LIGHT, col(0x7fc8e0), { emis: 0.5 });
    this.solid(34.6, 0, -2.6, 36.8, 1.12, 2.6);
    this.light(35.6, 1.7, 0, col(0x7fd8ff), 1.3);
    this.addInteract('nav', 34.2, 1.3, 0, 3.0, 'Konsola nawigacyjna');

    // holo-stół
    this.holo = { pos: [30.0, 1.1, 0] };
    mb.cylinder(30.0, 0, 0, 0.9, 0.8, 12, TILE.PANEL, col(0x49525f), {});
    mb.cylinder(30.0, 0.8, 0, 0.95, 0.1, 12, TILE.LIGHT, col(0x86e8ff), { emis: 0.6 });
    this.solid(29.1, 0, -0.9, 30.9, 0.9, 0.9);

    // boczne stanowiska
    for (const s of [-1, 1]) {
      mb.box(28.4, 0.6, 4.6 * s - 1.4, 30.4, 1.0, 4.6 * s + 1.4, TILE.PANEL, col(0x4b5462), { uvScale: 0.7 });
      mb.box(28.4, 1.0, 4.6 * s - 1.3, 29.6, 1.06, 4.6 * s + 1.3, TILE.LIGHT, col(0xffc98a), { emis: 0.8 });
      this.solid(28.4, 0, 4.6 * s - 1.4, 30.4, 1.06, 4.6 * s + 1.4);
      this.light(29.4, 1.5, 4.6 * s, col(0xffb877), 0.6);
      // fotel
      mb.transform(31.6, 0, 4.6 * s, s > 0 ? -1.2 : 1.2, 0.9);
      mb.cylinder(0, 0, 0, 0.4, 0.2, 10, TILE.PLAIN, col(0x4a525e), {});
      mb.box(-0.42, 0.5, -0.42, 0.42, 0.62, 0.42, TILE.CARPET, col(0xb0b8c8), { uvScale: 1 });
      mb.box(-0.42, 0.62, -0.52, 0.42, 1.5, -0.38, TILE.CARPET, col(0xa0a8b8), { uvScale: 1 });
      mb.cylinder(0, 0.2, 0, 0.14, 0.3, 8, TILE.PLAIN, col(0x6a737d), {});
      mb.resetTransform();
    }
    // przednia rama okna z pasem świetlnym
    mb.box(39.6, 0.55, -6.4, 39.75, 0.7, 6.4, TILE.LIGHT, C.accent, { emis: 0.9 });
    this.pot(mb, 27.4, 6.0, 0.8);
    this.pot(mb, 27.4, -6.0, 0.8);
  }

  /* ---------- pomocnicze zapytania o świat ---------- */
  roomAt(x, z) {
    for (const r of RECTS) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r;
    return null;
  }
  isInside(x, y, z) {
    if (y < HULL_BOT - 0.2 || y > CEIL_Y + 0.4) return false;
    return !!this.roomAt(x, z);
  }
}
