'use strict';
/* ---------- The Ship :: kosmos, planety, teren ---------- */

const SKY_R = 400;
const TERRAIN_HALF = 168;
const TERRAIN_STEP = 3.0;
const PAD_RX = 52, PAD_RZ = 24;   // wypłaszczenie terenu pod statkiem
const PAD_Y = -0.9;               // grunt niżej niż podłoga statku (0) – bez migotania

const PLANETS = [
  {
    id: 'verdana', name: 'Verdana Prime', kind: 'Świat leśny',
    desc: 'Ciepłe łąki, gaje i mnóstwo spokoju. Idealna na piknik.',
    dist: '4.2 lat św.', seed: 101,
    skyDir: vnorm([0.85, 0.10, 0.52]), size: 26,
    colA: col(0x4f8f4a), colB: col(0x2f6ea0), ring: false,
    amp: 16, freq: 0.011, ridged: false,
    colLow: col(0x86b45e), colMid: col(0x9ec96e), colHigh: col(0xb9c3a8),
    tileLow: TILE.GRASS, tileMid: TILE.GRASS, tileHigh: TILE.ROCK,
    water: -2.5, waterCol: col(0x4fa8c8),
    skyTop: col(0x3f7fd0), skyBot: col(0xbfe0f0), fogCol: col(0xc4e2ee), fogDensity: 0.0035,
    sunDir: vnorm([0.5, 0.65, 0.3]), sunCol: col(0xfff0d8), ambient: [0.42, 0.46, 0.48],
    gravity: 11, propSet: 'forest', resource: 'organic', airless: false
  },
  {
    id: 'rust', name: 'Rust Mesa', kind: 'Czerwona pustynia',
    desc: 'Rdzawe kaniony i wysokie iglice. Wiatr niesie kurz.',
    dist: '7.8 lat św.', seed: 202,
    skyDir: vnorm([-0.6, 0.18, 0.75]), size: 20,
    colA: col(0xb45f3a), colB: col(0x8a4a2c), ring: false,
    amp: 26, freq: 0.009, ridged: true,
    colLow: col(0xc98a5c), colMid: col(0xb06a44), colHigh: col(0x8f5638),
    tileLow: TILE.SAND, tileMid: TILE.ROCK, tileHigh: TILE.ROCK,
    water: -99, waterCol: col(0x000000),
    skyTop: col(0xc06a4a), skyBot: col(0xf0c090), fogCol: col(0xe0a878), fogDensity: 0.0055,
    sunDir: vnorm([-0.4, 0.55, 0.5]), sunCol: col(0xffd0a0), ambient: [0.45, 0.36, 0.3],
    gravity: 9, propSet: 'desert', resource: 'mineral', airless: false
  },
  {
    id: 'cryos', name: 'Cryos', kind: 'Lodowy księżyc',
    desc: 'Ciche pola śniegu i lodowe iglice. Twój oddech paruje.',
    dist: '11.5 lat św.', seed: 303,
    skyDir: vnorm([0.1, 0.25, -0.96]), size: 17,
    colA: col(0xcfe4f2), colB: col(0x8ab4d0), ring: false,
    amp: 18, freq: 0.012, ridged: false,
    colLow: col(0xe8f2fa), colMid: col(0xd6e8f6), colHigh: col(0xffffff),
    tileLow: TILE.ICE, tileMid: TILE.ICE, tileHigh: TILE.ICE,
    water: -99, waterCol: col(0x000000),
    skyTop: col(0x2a4a78), skyBot: col(0xa8c8e8), fogCol: col(0xc8dcee), fogDensity: 0.006,
    sunDir: vnorm([0.3, 0.42, -0.6]), sunCol: col(0xd8e8ff), ambient: [0.45, 0.5, 0.58],
    gravity: 7, propSet: 'ice', resource: 'crystal', airless: false
  },
  {
    id: 'amethyst', name: 'Amethyst', kind: 'Świat obcych grzybów',
    desc: 'Fioletowe lasy grzybowe świecące po zmroku. Bardzo dziwne, bardzo ładne.',
    dist: '19.0 lat św.', seed: 404,
    skyDir: vnorm([-0.85, 0.30, -0.42]), size: 23,
    colA: col(0x8a5fc0), colB: col(0x503080), ring: true,
    amp: 20, freq: 0.010, ridged: false,
    colLow: col(0x8f6fb8), colMid: col(0xa27fd0), colHigh: col(0xc8b0e8),
    tileLow: TILE.GRASS, tileMid: TILE.SOIL, tileHigh: TILE.ROCK,
    water: -4, waterCol: col(0x9f60d0),
    skyTop: col(0x2a1250), skyBot: col(0x8f4fa8), fogCol: col(0x6a3f90), fogDensity: 0.007,
    sunDir: vnorm([-0.5, 0.5, -0.3]), sunCol: col(0xd8a8ff), ambient: [0.34, 0.28, 0.44],
    gravity: 10, propSet: 'alien', resource: 'crystal', airless: false
  },
  {
    id: 'aurea', name: 'Duna Aurea', kind: 'Złote wydmy',
    desc: 'Morze piasku i ruiny kogoś, kto był tu przed tobą.',
    dist: '25.3 lat św.', seed: 505,
    skyDir: vnorm([0.25, -0.15, 0.95]), size: 21,
    colA: col(0xd8b464), colB: col(0xa8842c), ring: false,
    amp: 14, freq: 0.008, ridged: false,
    colLow: col(0xe8cc92), colMid: col(0xd8b878), colHigh: col(0xc0a060),
    tileLow: TILE.SAND, tileMid: TILE.SAND, tileHigh: TILE.ROCK,
    water: -99, waterCol: col(0x000000),
    skyTop: col(0x5a86c0), skyBot: col(0xf0dcb0), fogCol: col(0xe8d8b0), fogDensity: 0.0045,
    sunDir: vnorm([0.6, 0.5, -0.2]), sunCol: col(0xfff0c0), ambient: [0.48, 0.44, 0.36],
    gravity: 9.5, propSet: 'ruins', resource: 'mineral', airless: false
  },
  {
    id: 'nyx', name: 'Nyx', kind: 'Martwy księżyc',
    desc: 'Brak atmosfery, tylko pył, kratery i wielka cisza.',
    dist: '2.1 lat św.', seed: 606,
    skyDir: vnorm([-0.3, -0.4, -0.86]), size: 12,
    colA: col(0x9a9aa2), colB: col(0x6a6a72), ring: false,
    amp: 12, freq: 0.014, ridged: false,
    colLow: col(0x9b9ba4), colMid: col(0x8a8a94), colHigh: col(0xb4b4bc),
    tileLow: TILE.ROCK, tileMid: TILE.ROCK, tileHigh: TILE.ROCK,
    water: -99, waterCol: col(0x000000),
    skyTop: col(0x000000), skyBot: col(0x0a0a12), fogCol: col(0x05050a), fogDensity: 0.0012,
    sunDir: vnorm([0.7, 0.35, 0.2]), sunCol: col(0xffffff), ambient: [0.14, 0.14, 0.18],
    gravity: 4, propSet: 'moon', resource: 'mineral', airless: true
  }
];

/* ====================== KOSMOS (gwiazdy, planety na niebie) ====================== */
class Space {
  constructor(gl) {
    this.gl = gl;
    this.buildStars();
    this.planetMeshes = PLANETS.map(p => this.buildPlanetMesh(p));
    this.sun = this.buildSun();
    this.nebula = this.buildNebula();
  }

  buildStars() {
    const gl = this.gl;
    const N = 2400;
    const rnd = mulberry(9);
    const data = new Float32Array(N * 2 * 8);
    let o = 0;
    for (let i = 0; i < N; i++) {
      // rozkład na sferze
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const x = s * Math.cos(th) * SKY_R, y = u * SKY_R, z = s * Math.sin(th) * SKY_R;
      const t = rnd();
      const c = t < 0.72 ? [1, 1, 1] : (t < 0.86 ? [0.72, 0.82, 1] : (t < 0.95 ? [1, 0.88, 0.72] : [1, 0.72, 0.66]));
      const b = 0.35 + rnd() * 0.65;
      const size = 1.0 + rnd() * rnd() * 4.5;
      for (let k = 0; k < 2; k++) {
        data[o++] = x; data[o++] = y; data[o++] = z;
        data[o++] = c[0] * b; data[o++] = c[1] * b; data[o++] = c[2] * b;
        data[o++] = size; data[o++] = k;
      }
    }
    this.starBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.starBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.starCount = N * 2;
  }

  buildPlanetMesh(p) {
    const mb = new MeshBuilder();
    const seed = p.seed;
    const colorFn = (nx, ny, nz) => {
      const n = fbm(nx * 2.4 + 10, nz * 2.4 + (ny * 3), 5, seed);
      const bands = fbm(ny * 5.5, nx * 1.2, 3, seed + 5);
      let c = colMix(p.colB, p.colA, smoothstep(0.42, 0.62, n));
      c = colMix(c, colScale(p.colA, 1.35), smoothstep(0.6, 0.85, bands) * 0.5);
      // czapy polarne
      const polar = smoothstep(0.72, 0.95, Math.abs(ny));
      c = colMix(c, col(0xf0f6ff), polar * 0.85);
      return c;
    };
    mb.sphere(0, 0, 0, 1, 40, TILE.PLAIN, p.colA, { colorFn: colorFn });
    if (p.ring) {
      const rnd = mulberry(seed + 3);
      for (let i = 0; i < 48; i++) {
        const a0 = i / 48 * Math.PI * 2, a1 = (i + 1) / 48 * Math.PI * 2;
        for (let r = 0; r < 4; r++) {
          const r0 = 1.4 + r * 0.22, r1 = r0 + 0.18;
          const c = colScale(colMix(p.colA, col(0xffffff), 0.35 + rnd() * 0.4), 0.9);
          mb.quad(
            [Math.cos(a0) * r0, 0, Math.sin(a0) * r0],
            [Math.cos(a1) * r0, 0, Math.sin(a1) * r0],
            [Math.cos(a1) * r1, 0, Math.sin(a1) * r1],
            [Math.cos(a0) * r1, 0, Math.sin(a0) * r1], TILE.PLAIN, c, { u: 1, v: 1, emis: 0.25 });
          mb.quad(
            [Math.cos(a1) * r0, 0, Math.sin(a1) * r0],
            [Math.cos(a0) * r0, 0, Math.sin(a0) * r0],
            [Math.cos(a0) * r1, 0, Math.sin(a0) * r1],
            [Math.cos(a1) * r1, 0, Math.sin(a1) * r1], TILE.PLAIN, c, { u: 1, v: 1, emis: 0.25 });
        }
      }
    }
    return new Mesh(this.gl, mb);
  }

  buildSun() {
    const mb = new MeshBuilder();
    mb.sphere(0, 0, 0, 1, 20, TILE.LIGHT, col(0xfff4d8), { emis: 1 });
    mb.sphere(0, 0, 0, 1.5, 16, TILE.LIGHT, col(0xffd88a), { emis: 0.35 });
    return new Mesh(this.gl, mb);
  }

  buildNebula() {
    const mb = new MeshBuilder();
    const rnd = mulberry(55);
    for (let i = 0; i < 10; i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const d = [s * Math.cos(th), u * 0.65, s * Math.sin(th)];
      const p = [d[0] * SKY_R * 0.98, d[1] * SKY_R * 0.98, d[2] * SKY_R * 0.98];
      const size = 90 + rnd() * 160;
      const c = rnd() < 0.5 ? col(0x4a2f7a) : (rnd() < 0.5 ? col(0x2a4f7a) : col(0x7a2f5a));
      // billboard skierowany do środka — kilka nakładających się okręgów zamiast twardego kwadratu
      const up = [0, 1, 0];
      let rx = up[1] * d[2] - up[2] * d[1], ry = up[2] * d[0] - up[0] * d[2], rz = up[0] * d[1] - up[1] * d[0];
      const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
      const ux = d[1] * rz - d[2] * ry, uy = d[2] * rx - d[0] * rz, uz = d[0] * ry - d[1] * rx;
      const q = (cx0, cy0, sx, sy) => [p[0] + rx * (cx0 - sx) + ux * (cy0 - sy), p[1] + ry * (cx0 - sx) + uy * (cy0 - sy), p[2] + rz * (cx0 - sx) + uz * (cy0 - sy)];
      const petals = 5;
      for (let k = 0; k < petals; k++) {
        const off0 = (rnd() - 0.5) * size * 1.3, off1 = (rnd() - 0.5) * size * 1.3;
        const sk = size * (0.35 + rnd() * 0.5);
        const seg = 8;
        const cc = colScale(c, (0.35 + rnd() * 0.4) * (0.4 + rnd() * 0.5));
        for (let a = 0; a < seg; a++) {
          const a0 = a / seg * Math.PI * 2, a1 = (a + 1) / seg * Math.PI * 2;
          mb.quad(
            [p[0] + rx * off0 + ux * off1, p[1] + ry * off0 + uy * off1, p[2] + rz * off0 + uz * off1],
            [p[0] + rx * (off0 + Math.cos(a0) * sk) + ux * (off1 + Math.sin(a0) * sk), p[1] + ry * (off0 + Math.cos(a0) * sk) + uy * (off1 + Math.sin(a0) * sk), p[2] + rz * (off0 + Math.cos(a0) * sk) + uz * (off1 + Math.sin(a0) * sk)],
            [p[0] + rx * (off0 + Math.cos(a1) * sk) + ux * (off1 + Math.sin(a1) * sk), p[1] + ry * (off0 + Math.cos(a1) * sk) + uy * (off1 + Math.sin(a1) * sk), p[2] + rz * (off0 + Math.cos(a1) * sk) + uz * (off1 + Math.sin(a1) * sk)],
            [p[0] + rx * off0 + ux * off1, p[1] + ry * off0 + uy * off1, p[2] + rz * off0 + uz * off1],
            TILE.PLAIN, cc, { u: 1, v: 1, emis: 1 });
        }
      }
    }
    return new Mesh(this.gl, mb);
  }
}

/* ====================== TEREN PLANETY ====================== */
class Terrain {
  constructor(gl, planet, crewCount) {
    this.gl = gl;
    this.p = planet;
    this.crewCount = crewCount || 1;
    this.half = TERRAIN_HALF;
    this.step = TERRAIN_STEP;
    this.n = Math.floor((this.half * 2) / this.step);
    this.h = new Float32Array((this.n + 1) * (this.n + 1));
    this.lights = [];
    this.samples = [];
    this.colliders = [];
    this.notes = [];
    this.fire = null;
    this.genHeights();
    this.mesh = new Mesh(gl, this.buildMesh());
    this.props = new Mesh(gl, this.buildProps());
    this.buildSamples();
  }

  dispose() {
    this.mesh.dispose();
    this.props.dispose();
    if (this.water) this.water.dispose();
  }

  padFactor(x, z) {
    const e = Math.max(Math.abs(x) / PAD_RX, Math.abs(z) / PAD_RZ);
    return smoothstep(1.0, 2.0, e);
  }

  rawHeight(x, z) {
    const p = this.p;
    let n = fbm(x * p.freq, z * p.freq, 5, p.seed);
    if (p.ridged) n = 1 - Math.abs(n - 0.5) * 2;
    let h = (n - 0.45) * p.amp * 1.45;
    h += (fbm(x * p.freq * 4.4, z * p.freq * 4.4, 3, p.seed + 9) - 0.5) * p.amp * 0.55;
    h += (fbm(x * p.freq * 13, z * p.freq * 13, 2, p.seed + 21) - 0.5) * p.amp * 0.14;
    if (p.propSet === 'moon') {
      // kratery
      for (let i = 0; i < 7; i++) {
        const rnd = mulberry(p.seed + i * 31);
        const cx = (rnd() - 0.5) * 260, cz = (rnd() - 0.5) * 260, r = 18 + rnd() * 34;
        const d = Math.hypot(x - cx, z - cz);
        if (d < r) {
          const t = d / r;
          h += (Math.cos(t * Math.PI) * 0.5 + 0.5) * -7 + (1 - Math.abs(t - 0.92) * 8 > 0 ? 1.5 : 0);
        }
      }
    }
    const f = this.padFactor(x, z);
    return PAD_Y + (h - PAD_Y) * f;
  }

  genHeights() {
    for (let j = 0; j <= this.n; j++) {
      for (let i = 0; i <= this.n; i++) {
        const x = -this.half + i * this.step, z = -this.half + j * this.step;
        this.h[j * (this.n + 1) + i] = this.rawHeight(x, z);
      }
    }
  }

  gh(i, j) {
    i = clamp(i, 0, this.n); j = clamp(j, 0, this.n);
    return this.h[j * (this.n + 1) + i];
  }

  /* wysokość terenu w dowolnym punkcie (zgodna z geometrią) */
  height(x, z) {
    const fx = (x + this.half) / this.step, fz = (z + this.half) / this.step;
    const i = Math.floor(fx), j = Math.floor(fz);
    const u = fx - i, v = fz - j;
    const h00 = this.gh(i, j), h10 = this.gh(i + 1, j), h11 = this.gh(i + 1, j + 1), h01 = this.gh(i, j + 1);
    if (u >= v) return h00 + (h10 - h00) * u + (h11 - h10) * v;
    return h00 + (h11 - h01) * u + (h01 - h00) * v;
  }

  normalAt(x, z) {
    const d = 1.5;
    const hl = this.height(x - d, z), hr = this.height(x + d, z);
    const hd = this.height(x, z - d), hu = this.height(x, z + d);
    return vnorm([hl - hr, 2 * d, hd - hu]);
  }

  buildMesh() {
    const p = this.p, mb = new MeshBuilder();
    const n = this.n, half = this.half, st = this.step;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x0 = -half + i * st, z0 = -half + j * st;
        const x1 = x0 + st, z1 = z0 + st;
        const a = this.gh(i, j), b = this.gh(i + 1, j), c = this.gh(i + 1, j + 1), d = this.gh(i, j + 1);
        const hAvg = (a + b + c + d) / 4;
        const slope = Math.max(Math.abs(a - c), Math.abs(b - d)) / st;
        let tile, cc;
        const hi = smoothstep(p.amp * 0.16, p.amp * 0.42, hAvg);
        if (slope > 0.55) { tile = p.tileHigh; cc = colMix(p.colHigh, p.colMid, 0.3); }
        else if (hi > 0.5) { tile = p.tileMid; cc = colMix(p.colMid, p.colHigh, hi - 0.5); }
        else { tile = p.tileLow; cc = colMix(p.colLow, p.colMid, hi * 2); }
        // delikatna wariacja koloru
        const v = 0.9 + hash2(i, j, p.seed) * 0.2;
        cc = colScale(cc, v);
        mb.quad([x0, a, z0], [x0, d, z1], [x1, c, z1], [x1, b, z0], tile, cc, { uvScale: 0.22 });
      }
    }
    return mb;
  }

  /* rozstawienie skał, drzew, kryształów… */
  buildProps() {
    const p = this.p, mb = new MeshBuilder();
    const rnd = mulberry(p.seed * 7 + 13);
    const count = 420;
    for (let i = 0; i < count; i++) {
      const ang = rnd() * Math.PI * 2;
      const rad = 22 + Math.sqrt(rnd()) * (TERRAIN_HALF - 30);
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      if (Math.abs(x) < PAD_RX * 1.15 && Math.abs(z) < PAD_RZ * 1.35) continue;
      const y = this.height(x, z);
      if (y < p.water) continue;
      const s = 0.6 + rnd() * 1.1;
      const yaw = rnd() * Math.PI * 2;
      const nearShip = Math.hypot(x, z) < 90;
      switch (p.propSet) {
        case 'forest': this.forestProp(mb, x, y, z, s, yaw, rnd, nearShip); break;
        case 'desert': this.desertProp(mb, x, y, z, s, yaw, rnd); break;
        case 'ice': this.iceProp(mb, x, y, z, s, yaw, rnd); break;
        case 'alien': this.alienProp(mb, x, y, z, s, yaw, rnd); break;
        case 'ruins': this.ruinsProp(mb, x, y, z, s, yaw, rnd); break;
        default: this.moonProp(mb, x, y, z, s, yaw, rnd); break;
      }
    }
    // kępki roślinności blisko statku
    if (p.propSet !== 'moon' && p.propSet !== 'ruins') {
      for (let i = 0; i < 500; i++) {
        const x = (rnd() - 0.5) * 230, z = (rnd() - 0.5) * 230;
        if (Math.abs(x) < PAD_RX && Math.abs(z) < PAD_RZ) continue;
        const y = this.height(x, z);
        if (y < p.water) continue;
        const c = p.propSet === 'ice' ? col(0xd8ecff) : (p.propSet === 'alien' ? col(0xc890f0) : col(0x8fc45a));
        mb.transform(x, y - 0.05, z, rnd() * 6, 0.6 + rnd() * 0.7);
        mb.cross(0, 0, 0, 0.9, 0.8, TILE.LEAF, colScale(c, 0.8 + rnd() * 0.4), {});
        mb.resetTransform();
      }
    }
    // ślady załogi – tylko na Verdana Prime
    if (p.id === 'verdana') this.buildCamp(mb);

    // woda (jeśli planeta ją ma)
    if (p.water > -50) {
      const wb = new MeshBuilder();
      wb.plane(-TERRAIN_HALF, -TERRAIN_HALF, TERRAIN_HALF, TERRAIN_HALF, p.water, TILE.PLAIN, p.waterCol, { uvScale: 0.05, emis: 0.12 });
      this.water = new Mesh(this.gl, wb);
    }
    return mb;
  }

  forestProp(mb, x, y, z, s, yaw, rnd, near) {
    const t = rnd();
    if (t < 0.45) {
      // drzewo
      const h = (2.6 + rnd() * 3.4) * s;
      mb.transform(x, y, z, yaw, 1);
      mb.cylinder(0, -0.3, 0, 0.24 * s, h, 7, TILE.WOOD, col(0x8a6a48), { rTop: 0.16 * s });
      const cc = colMix(col(0x6fb44a), col(0x3f8f52), rnd());
      mb.sphere(0, h + 0.5 * s, 0, 1.5 * s, 8, TILE.LEAF, cc, { squash: 0.8 });
      mb.sphere(0.9 * s, h - 0.2 * s, 0.5 * s, 1.0 * s, 7, TILE.LEAF, colScale(cc, 0.9), {});
      mb.sphere(-0.8 * s, h + 0.1 * s, -0.6 * s, 0.9 * s, 7, TILE.LEAF, colScale(cc, 1.05), {});
      mb.resetTransform();
      this.colliders.push([x - 0.4 * s, y - 1, z - 0.4 * s, x + 0.4 * s, y + h, z + 0.4 * s]);
    } else if (t < 0.7) {
      mb.blob(x, y + 0.4 * s, z, 1.0 * s, 0.55, (x * 31 + z * 17) | 0, TILE.ROCK, colScale(col(0x9a9488), 0.9 + rnd() * 0.25), { stretch: 0.75 });
      this.colliders.push([x - s, y - 1, z - s, x + s, y + s, z + s]);
    } else if (t < 0.88) {
      // krzak
      mb.transform(x, y, z, yaw, s);
      mb.sphere(0, 0.5, 0, 0.7, 7, TILE.LEAF, colMix(col(0x7fc45a), col(0x4f9f5a), rnd()), { squash: 0.75 });
      mb.resetTransform();
    } else {
      // kwiaty
      mb.transform(x, y, z, yaw, s);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * 6.28, r = 0.3 + rnd() * 0.4;
        mb.cylinder(Math.cos(a) * r, 0, Math.sin(a) * r, 0.03, 0.5, 5, TILE.LEAF, col(0x6fa04a), {});
        mb.sphere(Math.cos(a) * r, 0.55, Math.sin(a) * r, 0.14, 6, TILE.PLAIN, rnd() < 0.5 ? col(0xff8fa8) : col(0xffe066), { emis: 0.15 });
      }
      mb.resetTransform();
    }
  }

  desertProp(mb, x, y, z, s, yaw, rnd) {
    const t = rnd();
    if (t < 0.5) {
      mb.blob(x, y + 0.5 * s, z, 1.2 * s, 0.6, (x * 13 + z * 29) | 0, TILE.ROCK, colScale(col(0xb0714a), 0.85 + rnd() * 0.3), { stretch: 0.7 });
      this.colliders.push([x - s, y - 1, z - s, x + s, y + s * 1.2, z + s]);
    } else if (t < 0.78) {
      // iglica skalna
      const h = (3 + rnd() * 7) * s;
      mb.transform(x, y - 0.5, z, yaw, 1);
      mb.cylinder(0, 0, 0, 1.1 * s, h, 6, TILE.ROCK, colScale(col(0xa8643c), 0.9 + rnd() * 0.2), { rTop: 0.35 * s });
      mb.resetTransform();
      this.colliders.push([x - 1.2 * s, y - 1, z - 1.2 * s, x + 1.2 * s, y + h, z + 1.2 * s]);
    } else if (t < 0.92) {
      // suchy krzew
      mb.transform(x, y, z, yaw, s);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.28;
        mb.cylinder(0, 0, 0, 0.06, 0.9 + rnd() * 0.5, 4, TILE.WOOD, col(0x9a7a52), { rTop: 0.02 });
        mb.transform(x + Math.cos(a) * 0.25 * s, y, z + Math.sin(a) * 0.25 * s, a, s);
      }
      mb.resetTransform();
    } else {
      mb.transform(x, y, z, yaw, s);
      mb.blob(0, 0.3, 0, 0.5, 0.3, (x * 7 + z * 3) | 0, TILE.CRYSTAL, col(0xffb765), { emis: 0.3 });
      mb.resetTransform();
    }
  }

  iceProp(mb, x, y, z, s, yaw, rnd) {
    const t = rnd();
    if (t < 0.45) {
      const h = (2.5 + rnd() * 6) * s;
      mb.transform(x, y - 0.4, z, yaw, 1);
      mb.cylinder(0, 0, 0, 0.7 * s, h, 5, TILE.CRYSTAL, colMix(col(0xa8d8f0), col(0xffffff), rnd()), { rTop: 0.05, emis: 0.18 });
      mb.resetTransform();
      this.colliders.push([x - 0.8 * s, y - 1, z - 0.8 * s, x + 0.8 * s, y + h, z + 0.8 * s]);
      if (rnd() < 0.2) this.lights.push({ pos: [x, y + h * 0.5, z], col: colScale(col(0x77c8ff), 0.5) });
    } else if (t < 0.75) {
      mb.blob(x, y + 0.3 * s, z, 1.0 * s, 0.5, (x * 19 + z * 7) | 0, TILE.ICE, col(0xe4f0fa), { stretch: 0.6 });
      this.colliders.push([x - s, y - 1, z - s, x + s, y + s, z + s]);
    } else {
      mb.transform(x, y, z, yaw, s);
      for (let i = 0; i < 4; i++) {
        const a = rnd() * 6.28, r = rnd() * 0.6;
        mb.cylinder(Math.cos(a) * r, 0, Math.sin(a) * r, 0.16, 0.6 + rnd() * 1.2, 5, TILE.CRYSTAL, col(0xd8f0ff), { rTop: 0.02, emis: 0.25 });
      }
      mb.resetTransform();
    }
  }

  alienProp(mb, x, y, z, s, yaw, rnd) {
    const t = rnd();
    if (t < 0.45) {
      // wielki grzyb
      const h = (2.2 + rnd() * 3.5) * s;
      const capC = rnd() < 0.5 ? col(0xd06fd8) : col(0x8f6fe8);
      mb.transform(x, y, z, yaw, 1);
      mb.cylinder(0, -0.2, 0, 0.28 * s, h, 8, TILE.PLAIN, col(0xe8dcf0), { rTop: 0.20 * s });
      mb.sphere(0, h, 0, 1.5 * s, 10, TILE.PLAIN, capC, { squash: 0.5, emis: 0.22 });
      mb.cylinder(0, h - 0.15 * s, 0, 1.45 * s, 0.12, 10, TILE.PLAIN, col(0xf0d8ff), { emis: 0.4 });
      mb.resetTransform();
      this.colliders.push([x - 0.4 * s, y - 1, z - 0.4 * s, x + 0.4 * s, y + h, z + 0.4 * s]);
      if (rnd() < 0.35) this.lights.push({ pos: [x, y + h, z], col: colScale(capC, 0.75) });
    } else if (t < 0.72) {
      // świecący kryształ
      const h = (1.6 + rnd() * 3.4) * s;
      mb.transform(x, y - 0.3, z, yaw, 1);
      mb.cylinder(0, 0, 0, 0.45 * s, h, 5, TILE.CRYSTAL, col(0xc890ff), { rTop: 0.04, emis: 0.5 });
      mb.resetTransform();
      this.lights.push({ pos: [x, y + h * 0.6, z], col: colScale(col(0xa070ff), 0.8) });
      this.colliders.push([x - 0.5 * s, y - 1, z - 0.5 * s, x + 0.5 * s, y + h, z + 0.5 * s]);
    } else if (t < 0.9) {
      mb.blob(x, y + 0.35 * s, z, 0.9 * s, 0.5, (x * 23 + z * 11) | 0, TILE.ROCK, col(0x7a6a90), { stretch: 0.7 });
    } else {
      mb.transform(x, y, z, yaw, s);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * 6.28, r = 0.4 + rnd() * 0.5;
        mb.sphere(Math.cos(a) * r, 0.25 + rnd() * 0.4, Math.sin(a) * r, 0.2, 6, TILE.PLAIN, col(0x8ff0d8), { emis: 0.6 });
      }
      mb.resetTransform();
    }
  }

  ruinsProp(mb, x, y, z, s, yaw, rnd) {
    const t = rnd();
    if (t < 0.3) {
      // kolumna
      const h = (2.5 + rnd() * 5) * s;
      mb.transform(x, y - 0.4, z, yaw, 1);
      mb.cylinder(0, 0, 0, 0.55 * s, h, 10, TILE.ROCK, col(0xd8c8a0), { rTop: 0.5 * s });
      mb.box(-0.75 * s, h, -0.75 * s, 0.75 * s, h + 0.3 * s, 0.75 * s, TILE.ROCK, col(0xc8b890), { uvScale: 0.8 });
      mb.resetTransform();
      this.colliders.push([x - 0.7 * s, y - 1, z - 0.7 * s, x + 0.7 * s, y + h, z + 0.7 * s]);
    } else if (t < 0.6) {
      mb.blob(x, y + 0.3 * s, z, 1.1 * s, 0.5, (x * 5 + z * 41) | 0, TILE.SAND, colScale(col(0xd8bc86), 0.9 + rnd() * 0.2), { stretch: 0.55 });
      this.colliders.push([x - s, y - 1, z - s, x + s, y + s * 0.7, z + s]);
    } else if (t < 0.82) {
      // fragment muru
      mb.transform(x, y - 0.3, z, yaw, 1);
      mb.box(-2.2 * s, 0, -0.4 * s, 2.2 * s, (1.2 + rnd() * 2) * s, 0.4 * s, TILE.ROCK, col(0xcfbc94), { uvScale: 0.5 });
      mb.resetTransform();
      this.colliders.push([x - 2.3 * s, y - 1, z - 0.6 * s, x + 2.3 * s, y + 3 * s, z + 0.6 * s]);
    } else {
      mb.transform(x, y, z, yaw, s);
      mb.box(-0.5, 0, -0.5, 0.5, 0.35, 0.5, TILE.ROCK, col(0xe0d0a8), { uvScale: 1 });
      mb.cylinder(0, 0.35, 0, 0.3, 1.4, 6, TILE.CRYSTAL, col(0xffd98a), { rTop: 0.06, emis: 0.45 });
      mb.resetTransform();
      this.lights.push({ pos: [x, y + 1.4 * s, z], col: colScale(col(0xffc060), 0.7) });
    }
  }

  moonProp(mb, x, y, z, s, yaw, rnd) {
    if (rnd() < 0.8) {
      mb.blob(x, y + 0.3 * s, z, (0.7 + rnd() * 1.4) * s, 0.6, (x * 3 + z * 37) | 0, TILE.ROCK, colScale(col(0x9a9aa4), 0.85 + rnd() * 0.3), { stretch: 0.7 });
      this.colliders.push([x - s, y - 1, z - s, x + s, y + s, z + s]);
    } else {
      mb.transform(x, y - 0.2, z, yaw, s);
      mb.cylinder(0, 0, 0, 0.35, 1.5 + rnd() * 2, 5, TILE.ROCK, col(0xa8a8b0), { rTop: 0.08 });
      mb.resetTransform();
    }
  }

  /* wybiera suche i w miarę płaskie miejsce w pierścieniu wokół statku */
  pickSite(rMin, rMax, seedAng) {
    let best = null, bestScore = -1e9;
    for (let a = 0; a < 48; a++) {
      const ang = seedAng + a / 48 * Math.PI * 2;
      for (let rr = rMin; rr <= rMax; rr += 8) {
        const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
        const h = this.height(x, z);
        if (h < this.p.water + 3.0) continue;
        if (Math.abs(x) < PAD_RX * 1.25 && Math.abs(z) < PAD_RZ * 1.5) continue;
        let mn = 1e9, mx = -1e9;
        for (const d of [[-6, 0], [6, 0], [0, -6], [0, 6], [-5, -5], [5, 5], [-5, 5], [5, -5]]) {
          const hh = this.height(x + d[0], z + d[1]);
          if (hh < mn) mn = hh;
          if (hh > mx) mx = hh;
        }
        const score = -(mx - mn) * 4 - Math.abs(rr - (rMin + rMax) / 2) * 0.05;
        if (score > bestScore) { bestScore = score; best = [x, z]; }
      }
    }
    return best;
  }

  /* najbliższy suchy punkt wokół zadanej pozycji */
  dryNear(x, z, radius) {
    if (this.height(x, z) > this.p.water + 2.2) return [x, z];
    for (let k = 1; k <= 50; k++) {
      const a = k * 2.3999, rr = radius * Math.sqrt(k / 50);
      const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
      if (this.height(px, pz) > this.p.water + 2.2) return [px, pz];
    }
    return [x, z];
  }

  /* ---------- obozowisko załogi na Verdana Prime ---------- */
  buildCamp(mb) {
    const rnd = mulberry(9111);
    this.notes = [];
    const H = (x, z) => this.height(x, z);

    const site = this.pickSite(96, 140, 1.9) || [-70, 132];
    const cx = site[0], cz = site[1];
    const cy = H(cx, cz);
    this.campPos = [cx, cy, cz];
    // kapsuły lądują w rozproszeniu bliżej statku
    const toShip = Math.atan2(-cz, -cx);
    const pods = [];
    for (let i = 0; i < 3; i++) {
      const a = toShip + (i - 1) * 0.42;
      const d = 26 + i * 7;
      const raw = [cx + Math.cos(a) * d, cz + Math.sin(a) * d];
      const dry = this.dryNear(raw[0], raw[1], 22);
      pods.push([dry[0], dry[1], (i - 1) * 1.3 + 0.5]);
    }

    // ślad butów: ciąg odcisków od kapsuł do obozu i dalej w las
    const trail = (x0, z0, x1, z1, n) => {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x = lerp(x0, x1, t) + Math.sin(t * 9 + rnd()) * 0.6;
        const z = lerp(z0, z1, t) + Math.cos(t * 7) * 0.6;
        const y = H(x, z);
        const side = (i % 2) ? 0.22 : -0.22;
        const ang = Math.atan2(x1 - x0, z1 - z0);
        mb.transform(x + Math.cos(ang) * side, y + 0.035, z - Math.sin(ang) * side, ang, 1);
        mb.plane(-0.11, -0.17, 0.11, 0.17, 0, TILE.SOIL, col(0x6a5236), { uvScale: 1.6 });
        mb.resetTransform();
      }
    };

    /* --- trzy kapsuły ratunkowe wbite w ziemię --- */
    for (let i = 0; i < pods.length; i++) {
      const px = pods[i][0], pz = pods[i][1], tilt = pods[i][2];
      const py = H(px, pz);
      // wypalona ziemia
      mb.transform(px, py + 0.04, pz, tilt, 1);
      mb.plane(-4.2, -4.2, 4.2, 4.2, 0, TILE.SOIL, col(0x4a3a2a), { uvScale: 0.4 });
      mb.plane(-2.4, -2.4, 2.4, 2.4, 0.02, TILE.SOIL, col(0x2e241a), { uvScale: 0.6 });
      mb.resetTransform();
      // korpus kapsuły, przechylony (obrót w poziomie + zanurzenie)
      mb.transform(px, py - 0.5, pz, tilt, 1);
      mb.cylinder(0, 0, 0, 0.9, 1.6, 12, TILE.PANEL, col(0xc4cad2), { uvScale: 0.8 });
      mb.cylinder(0, 1.6, 0, 0.9, 0.75, 12, TILE.PANEL, col(0xaeb5be), { rTop: 0.38 });
      mb.cylinder(0, -0.4, 0, 0.62, 0.4, 12, TILE.RIDGE, col(0x3f454d), { rTop: 0.9 });
      // otwarty właz oparty o kadłub
      mb.transform(px + Math.cos(tilt) * 1.5, py + 0.1, pz + Math.sin(tilt) * 1.5, tilt + 0.9, 1);
      mb.box(-0.72, 0, -0.1, 0.72, 1.35, 0.1, TILE.PANEL, col(0xb8bfc8), { uvScale: 0.9 });
      mb.resetTransform();
      mb.transform(px, py - 0.5, pz, tilt, 1);
      mb.box(-0.45, 0.6, 0.86, 0.45, 1.2, 0.96, TILE.PLAIN, col(0x14181e), { uvScale: 1 });
      mb.box(-0.5, 1.95, -0.5, 0.5, 2.05, 0.5, TILE.PLAIN, col(0x6a7078), { uvScale: 1 });
      mb.resetTransform();
      this.colliders.push([px - 1.1, py - 2, pz - 1.1, px + 1.1, py + 2.2, pz + 1.1]);
      // numer na kadłubie
      mb.transform(px, py + 0.9, pz, tilt, 1);
      mb.box(-0.16, 0, 0.88, 0.16, 0.34, 0.9, TILE.PLAIN, col(0x2f343c), { uvScale: 1 });
      mb.resetTransform();
    }

    /* --- obozowisko --- */
    // ognisko
    mb.transform(cx, cy, cz, 0, 1);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      mb.blob(Math.cos(a) * 1.05, 0.1, Math.sin(a) * 1.05, 0.26, 0.5, i * 17, TILE.ROCK, col(0x8b8378), { seg: 6, rings: 3 });
    }
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      mb.transform(cx + Math.cos(a) * 0.35, cy + 0.1, cz + Math.sin(a) * 0.35, a, 1);
      mb.cylinder(0, 0, 0, 0.07, 0.75, 5, TILE.WOOD, col(0x4a3524), { rTop: 0.05 });
      mb.resetTransform();
    }
    mb.resetTransform();
    // zwęglone drewno i popiół
    mb.transform(cx, cy + 0.06, cz, 0, 1);
    mb.plane(-1.5, -1.5, 1.5, 1.5, 0, TILE.SOIL, col(0x33291f), { uvScale: 1 });
    mb.resetTransform();

    // dwa namioty
    const tent = (tx, tz, yaw, c) => {
      const ty = H(tx, tz);
      const W = 1.55, L = 1.75, Ht = 1.5;
      mb.transform(tx, ty, tz, yaw, 1);
      // podłoga namiotu
      mb.box(-W - 0.1, 0, -L - 0.05, W + 0.1, 0.07, L + 0.05, TILE.CARPET, colScale(c, 0.55), { uvScale: 0.6 });
      // dwie połacie dachu
      mb.quad([-W, 0.05, L], [0, Ht, L], [0, Ht, -L], [-W, 0.05, -L], TILE.CARPET, c, { uvScale: 0.7 });
      mb.quad([W, 0.05, -L], [0, Ht, -L], [0, Ht, L], [W, 0.05, L], TILE.CARPET, colScale(c, 0.88), { uvScale: 0.7 });
      // ścianki szczytowe
      mb.quad([-W, 0.05, L], [W, 0.05, L], [0, Ht, L], [0, Ht, L], TILE.CARPET, colScale(c, 0.72), { uvScale: 0.7 });
      mb.quad([W, 0.05, -L], [-W, 0.05, -L], [0, Ht, -L], [0, Ht, -L], TILE.CARPET, colScale(c, 0.72), { uvScale: 0.7 });
      // kalenica i odciągi
      mb.box(-0.05, Ht - 0.02, -L - 0.25, 0.05, Ht + 0.05, L + 0.25, TILE.WOOD, col(0x8a6a4a), { uvScale: 1 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        mb.cylinder(sx * (W + 0.5), 0, sz * (L + 0.35), 0.045, 0.35, 5, TILE.WOOD, col(0x6a5540), {});
      }
      mb.resetTransform();
      this.colliders.push([tx - W - 0.2, ty - 1, tz - L - 0.2, tx + W + 0.2, ty + Ht, tz + L + 0.2]);
    };
    tent(cx - 5.4, cz + 1.2, 0.4, col(0xd08a5a));
    tent(cx + 5.0, cz - 1.6, -0.7, col(0x5a86a8));

    // skrzynie i sprzęt ze statku
    const crate = (bx, bz, s, c, yaw) => {
      const by = H(bx, bz);
      mb.transform(bx, by, bz, yaw, 1);
      mb.box(-s / 2, 0, -s / 2, s / 2, s * 0.8, s / 2, TILE.PANEL, c, { uvScale: 1 });
      mb.box(-s / 2 - 0.03, s * 0.34, -s / 2 - 0.03, s / 2 + 0.03, s * 0.42, s / 2 + 0.03, TILE.PLAIN, col(0x5b636d), { uvScale: 1 });
      mb.resetTransform();
      this.colliders.push([bx - s, by - 1, bz - s, bx + s, by + s, bz + s]);
    };
    crate(cx + 2.6, cz + 3.4, 1.0, col(0xd9a05b), 0.3);
    crate(cx + 3.5, cz + 2.6, 0.85, col(0x7fb6d9), -0.5);
    crate(cx - 3.0, cz - 2.8, 1.1, col(0xb0b8c2), 0.9);

    // maszt z flagą / znacznik
    const mx = cx + 0.5, mz = cz - 4.6, my = H(mx, mz);
    mb.cylinder(mx, my, mz, 0.09, 3.6, 8, TILE.RIDGE, col(0x8a929c), {});
    mb.transform(mx, my + 2.5, mz, 0.6, 1);
    mb.quad([0.1, 0, 0], [1.5, 0, 0], [1.5, 0.85, 0], [0.1, 0.85, 0], TILE.PLAIN, col(0x5fd8ee), { u: 1, v: 1, emis: 0.15 });
    mb.quad([1.5, 0, 0], [0.1, 0, 0], [0.1, 0.85, 0], [1.5, 0.85, 0], TILE.PLAIN, col(0x4fc0d6), { u: 1, v: 1, emis: 0.15 });
    mb.resetTransform();
    this.lights.push({ pos: [cx, cy + 1.0, cz], col: [1.15, 0.55, 0.18] });
    this.fire = { pos: [cx, cy + 0.35, cz] };

    // ławki z pni wokół ogniska
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + 0.5;
      const bx = cx + Math.cos(a) * 2.6, bz = cz + Math.sin(a) * 2.6;
      const by = H(bx, bz);
      mb.transform(bx, by, bz, a + Math.PI / 2, 1);
      mb.box(-0.28, 0.34, -0.95, 0.28, 0.56, 0.95, TILE.WOOD, col(0x8a6a4a), { uvScale: 0.8 });
      mb.box(-0.22, 0, -0.85, 0.22, 0.34, -0.6, TILE.WOOD, col(0x6f5438), { uvScale: 1 });
      mb.box(-0.22, 0, 0.6, 0.22, 0.34, 0.85, TILE.WOOD, col(0x6f5438), { uvScale: 1 });
      mb.resetTransform();
    }

    // ścieżki: od kapsuł do obozu i dalej w głąb lądu
    trail(pods[0][0], pods[0][1], cx - 1, cz - 2, 18);
    trail(pods[1][0], pods[1][1], cx + 2, cz - 3, 16);
    trail(pods[2][0], pods[2][1], cx - 3, cz - 1, 17);
    const away = Math.atan2(cz, cx);
    trail(cx, cz + 2, cx + Math.cos(away) * 46, cz + Math.sin(away) * 46, 22);

    /* --- notatki do przeczytania — treść zależy od tego, ile realnych osób leciało --- */
    const cc = clamp(this.crewCount || 1, 1, 4);
    const kajaText = [
      'Wylądowałyśmy całe. Kapsuła 4 poszła dalej na północ. Powietrze da się oddychać — Mira miała rację.',
      'Wylądowałyśmy całe, we dwie. Kapsuła 4 poszła dalej na północ. Powietrze da się oddychać — Mira miała rację.',
      'Wylądowałyśmy całe, we trzy. Reszta poszła dalej na północ. Powietrze da się oddychać — Mira miała rację.',
      'Cała nasza czwórka wylądowała bez szwanku. Powietrze da się oddychać — Mira miała rację. Trzymamy się razem.'
    ][cc - 1];
    const tobiText = [
      'Alarm był próbny. Zrozumieliśmy to za późno, już po odłączeniu. Wracaliśmy po ciebie trzy razy, ale kapsuły lecą tylko w jedną stronę.',
      'Alarm był próbny. Zrozumieliśmy to za późno. Wracaliśmy po was dwoje trzy razy, ale kapsuły lecą tylko w jedną stronę.',
      'Alarm był próbny. Zrozumieliśmy to za późno. Wracaliśmy po całą waszą trójkę, ale kapsuły lecą tylko w jedną stronę.',
      'Alarm był próbny. Zrozumieliśmy to za późno — a wy czworo i tak już byliście na miejscu, kiedy się odłączaliśmy.'
    ][cc - 1];
    const miraText = [
      'Posadziłam tu nasiona mamy. Jeśli to czytasz, to znaczy, że jednak przyleciałeś. Idź na północ, wzdłuż śladów. Czekamy.',
      'Posadziłam tu nasiona mamy. Jeśli to czytacie we dwoje, to znaczy, że jednak przylecieliście. Idźcie na północ, wzdłuż śladów. Czekamy.',
      'Posadziłam tu nasiona mamy. Jeśli czyta to cała wasza trójka, to znaczy, że jednak przylecieliście. Idźcie na północ. Czekamy.',
      'Posadziłam tu nasiona mamy — akurat na czworo więcej rąk do sadzenia. Idźcie na północ, wzdłuż śladów. Czekamy na całą waszą ekipę.'
    ][cc - 1];
    const renText = [
      'Zostawiam czajnik przy ognisku. Wiedziałem, że w końcu przyjdziesz się napić.',
      'Zostawiam dwa kubki przy ognisku. Wiedziałem, że w końcu tu dotrzecie, we dwoje.',
      'Zostawiam trzy kubki przy ognisku. Wiedziałem, że cała wasza trójka w końcu tu dotrze.',
      'Zostawiam cztery kubki przy ognisku — po jednym na każdego z was. Wiedziałem, że cała ekipa dotrze razem.'
    ][cc - 1];
    this.notes = [
      { pos: [pods[0][0] + 2.0, H(pods[0][0] + 2.0, pods[0][1] + 1.6) + 0.5, pods[0][1] + 1.6], title: 'Notatka Kai (nawigatorka)', text: kajaText },
      { pos: [cx + 1.8, H(cx + 1.8, cz + 1.2) + 0.5, cz + 1.2], title: 'Notatka Tobiego (mechanik)', text: tobiText },
      { pos: [cx - 5.4, H(cx - 5.4, cz + 3.6) + 0.5, cz + 3.6], title: 'Notatka Miry (botaniczka)', text: miraText },
      { pos: [cx + Math.cos(away) * 44, H(cx + Math.cos(away) * 44, cz + Math.sin(away) * 44) + 0.5, cz + Math.sin(away) * 44], title: 'Notatka Rena (kucharz)', text: renText }
    ];
  }

  /* świecące próbki do zebrania */
  buildSamples() {
    const rnd = mulberry(this.p.seed + 777);
    for (let i = 0; i < 16; i++) {
      let x, z, tries = 0;
      do {
        const ang = rnd() * Math.PI * 2;
        const rad = 40 + rnd() * 105;
        x = Math.cos(ang) * rad; z = Math.sin(ang) * rad;
        tries++;
      } while (tries < 20 && Math.abs(x) < PAD_RX * 1.1 && Math.abs(z) < PAD_RZ * 1.2);
      const y = this.height(x, z);
      if (y < this.p.water + 0.4) { continue; }
      this.samples.push({ pos: [x, y + 0.75, z], taken: false, phase: rnd() * 6.28 });
    }
  }
}

/* siatka pojedynczej próbki (kryształek unoszący się nad ziemią) */
function buildSampleMesh(gl, c) {
  const mb = new MeshBuilder();
  mb.cylinder(0, -0.30, 0, 0.02, 0.30, 5, TILE.CRYSTAL, c, { rTop: 0.16, emis: 0.9 });
  mb.cylinder(0, 0, 0, 0.16, 0.30, 5, TILE.CRYSTAL, c, { rTop: 0.02, emis: 0.9 });
  return new Mesh(gl, mb);
}

/* kopuła nieba planety */
function buildSkyDome(gl, p) {
  const mb = new MeshBuilder();
  const seg = 26, rings = 14, R = SKY_R * 0.96;
  const start = mb.n;
  for (let j = 0; j <= rings; j++) {
    const phi = j / rings * Math.PI;
    for (let i = 0; i <= seg; i++) {
      const th = i / seg * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(th), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(th);
      let c = colMix(p.skyBot, p.skyTop, smoothstep(-0.05, 0.75, ny));
      // poświata przy słońcu
      const d = nx * p.sunDir[0] + ny * p.sunDir[1] + nz * p.sunDir[2];
      c = colMix(c, colMix(p.sunCol, col(0xffffff), 0.4), Math.pow(clamp(d, 0, 1), 14) * 0.9);
      c = colMix(c, colScale(p.sunCol, 0.8), Math.pow(clamp(d, 0, 1), 3) * 0.25);
      if (ny < 0) c = colMix(c, colScale(p.fogCol, 0.75), smoothstep(0, -0.35, ny));
      // normalne do wewnątrz
      mb.vertex(nx * R, ny * R, nz * R, -nx, -ny, -nz, i / seg * 2, j / rings, c, 0, TILE.PLAIN);
    }
  }
  // kolejność odwrotna niż w kuli – kopułę oglądamy od środka
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    const a = start + j * (seg + 1) + i, b = a + seg + 1;
    mb.idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  return new Mesh(gl, mb);
}
