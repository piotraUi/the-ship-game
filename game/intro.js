'use strict';
/* ---------- The Ship :: film archiwalny 2026 (intro) ---------- */

/* prosta postać low-poly – używana w intrze i przez załogę */
function buildHuman(gl, o) {
  const mb = new MeshBuilder();
  const suit = col(o.suit);
  const suitD = colScale(col(o.suit), 0.78);
  const skin = col(o.skin === undefined ? 0xe8b98a : o.skin);
  const hair = col(o.hair === undefined ? 0x2a1f18 : o.hair);
  const acc = col(o.accent === undefined ? 0xffb765 : o.accent);
  const boot = col(0x30343c);

  mb.box(-0.19, 0, -0.14, -0.03, 0.10, 0.14, TILE.PANEL, boot, { uvScale: 1 });
  mb.box(0.03, 0, -0.14, 0.19, 0.10, 0.14, TILE.PANEL, boot, { uvScale: 1 });
  mb.box(-0.18, 0.10, -0.10, -0.02, 0.86, 0.10, TILE.PANEL, suitD, { uvScale: 1 });
  mb.box(0.02, 0.10, -0.10, 0.18, 0.86, 0.10, TILE.PANEL, suitD, { uvScale: 1 });
  mb.box(-0.25, 0.86, -0.13, 0.25, 1.44, 0.13, TILE.PANEL, suit, { uvScale: 1 });
  mb.box(-0.26, 0.83, -0.14, 0.26, 0.93, 0.14, TILE.PLAIN, col(0x2e333b), { uvScale: 1 });
  mb.box(0.11, 1.18, 0.13, 0.22, 1.31, 0.145, TILE.PLAIN, acc, { uvScale: 1 });
  mb.box(-0.37, 0.82, -0.10, -0.25, 1.42, 0.10, TILE.PANEL, suit, { uvScale: 1 });
  mb.box(0.25, 0.82, -0.10, 0.37, 1.42, 0.10, TILE.PANEL, suit, { uvScale: 1 });
  mb.box(-0.36, 0.70, -0.09, -0.26, 0.84, 0.09, TILE.PLAIN, skin, { uvScale: 1 });
  mb.box(0.26, 0.70, -0.09, 0.36, 0.84, 0.09, TILE.PLAIN, skin, { uvScale: 1 });
  mb.box(-0.07, 1.44, -0.07, 0.07, 1.53, 0.07, TILE.PLAIN, skin, { uvScale: 1 });
  mb.box(-0.13, 1.53, -0.12, 0.13, 1.79, 0.12, TILE.PLAIN, skin, { uvScale: 1 });
  mb.box(-0.14, 1.71, -0.13, 0.14, 1.85, 0.13, TILE.PLAIN, hair, { uvScale: 1 });
  mb.box(-0.145, 1.60, -0.135, -0.10, 1.74, -0.01, TILE.PLAIN, hair, { uvScale: 1 });
  mb.box(0.10, 1.60, -0.135, 0.145, 1.74, -0.01, TILE.PLAIN, hair, { uvScale: 1 });
  mb.box(-0.022, 1.632, 0.12, 0.022, 1.668, 0.152, TILE.PLAIN, colScale(skin, 0.97), { uvScale: 1 });
  mb.box(-0.095, 1.635, 0.12, -0.04, 1.675, 0.128, TILE.PLAIN, col(0x22242a), { uvScale: 1 });
  mb.box(0.04, 1.635, 0.12, 0.095, 1.675, 0.128, TILE.PLAIN, col(0x22242a), { uvScale: 1 });
  return new Mesh(gl, mb);
}

const EARTH_SKY = {
  skyTop: col(0x1d4a90), skyBot: col(0xf0b070),
  sunDir: vnorm([0.25, 0.10, -0.95]), sunCol: col(0xffd0a0),
  fogCol: col(0xd8b894)
};

class IntroFilm {
  constructor(gl, game) {
    this.gl = gl;
    this.game = game;
    this.built = false;
    this.active = false;
    this.t = 0;
    this.shotIdx = -1;
  }

  /* ---------- geometria ---------- */
  build() {
    if (this.built) return;
    this.built = true;
    const gl = this.gl;

    this.skyEarth = buildSkyDome(gl, EARTH_SKY);
    this.pad = new Mesh(gl, this.buildComplex());
    this.rocket = new Mesh(gl, this.buildRocket());
    this.flame = new Mesh(gl, this.buildFlame());
    this.smoke = new Mesh(gl, this.buildSmoke());
    this.earth = new Mesh(gl, this.buildEarthGlobe());
    this.capsule = new Mesh(gl, this.buildCapsule());
    this.capsuleGlass = new Mesh(gl, this.buildCapsuleGlass());
    this.person = buildHuman(gl, { suit: 0xb8c4d0, skin: 0xe8b98a, hair: 0x3a2a1c, accent: 0x5fd8ee });
    this.tear = new Mesh(gl, new MeshBuilder().boxAt(0, 0, 0, 0.022, 0.05, 0.022, TILE.LIGHT, col(0xbfe8ff), { emis: 1 }));
  }

  buildComplex() {
    const mb = new MeshBuilder();
    const rnd = mulberry(4242);

    mb.plane(-1400, -1400, 1400, 1400, -0.02, TILE.GRASS, col(0x6f8250), { uvScale: 0.035 });
    mb.plane(-300, -170, 300, 210, 0.03, TILE.PLAIN, col(0x8e9088), { uvScale: 0.05 });
    for (let i = -6; i <= 6; i++) {
      mb.plane(-300, i * 30 - 0.6, 300, i * 30 + 0.6, 0.06, TILE.PLAIN, col(0x74766f), { uvScale: 0.4 });
    }

    // stanowiska startowe
    for (let i = 0; i < 12; i++) {
      const x = -270 + i * 48;
      mb.plane(x - 15, 25, x + 15, 55, 0.08, TILE.PLAIN, col(0x6e7069), { uvScale: 0.25 });
      mb.box(x - 12, 0.08, 28, x + 12, 2.2, 52, TILE.RIDGE, col(0x7c7e78), { uvScale: 0.25 });
      mb.box(x - 4.5, 2.2, 36, x + 4.5, 3.4, 44, TILE.PLAIN, col(0x33363c), { uvScale: 0.5 });
      // wieża obsługowa
      const tx = x + 13;
      for (const s of [-1, 1]) {
        mb.box(tx - 1.4, 0, 40 + s * 5 - 0.7, tx + 1.4, 62, 40 + s * 5 + 0.7, TILE.RIDGE, col(0x8a6a3a), { uvScale: 0.35 });
      }
      for (let k = 0; k < 9; k++) {
        mb.box(tx - 1.6, 5 + k * 6.5, 34, tx + 1.6, 5.9 + k * 6.5, 46, TILE.RIDGE, col(0x9a7a44), { uvScale: 0.4 });
      }
      mb.box(tx - 2.0, 44, 33, tx + 2.0, 46.2, 41, TILE.RIDGE, col(0x8a6a3a), { uvScale: 0.4 });
      // zbiorniki
      mb.cylinder(x - 20, 0, 18, 3.4, 11, 12, TILE.PANEL, col(0xdfe2e6), {});
      mb.cylinder(x - 20, 11, 18, 3.4, 1.6, 12, TILE.PANEL, col(0xb8bdc4), { rTop: 2.2 });
    }

    // hangary i budynki
    for (let i = 0; i < 7; i++) {
      const x = -260 + i * 82, z = -110 - (i % 2) * 34;
      mb.box(x, 0, z, x + 56, 16, z + 28, TILE.PANEL, col(0xc4c8cc), { uvScale: 0.2 });
      mb.box(x - 0.4, 15.6, z - 0.4, x + 56.4, 17.4, z + 28.4, TILE.RIDGE, col(0x6a7078), { uvScale: 0.25 });
      mb.box(x + 18, 0, z + 27.9, x + 38, 12, z + 28.4, TILE.PLAIN, col(0x4a5058), { uvScale: 0.5 });
    }
    // wieża kontrolna
    mb.cylinder(150, 0, -80, 7, 44, 12, TILE.PANEL, col(0xcfd3d8), {});
    mb.cylinder(150, 44, -80, 12, 9, 12, TILE.PANEL, col(0x3f4650), {});
    mb.cylinder(150, 53, -80, 12.6, 1.2, 12, TILE.RIDGE, col(0x6a7078), {});
    // maszty świetlne
    for (let i = 0; i < 10; i++) {
      const x = -290 + i * 64;
      mb.cylinder(x, 0, 8, 0.6, 26, 6, TILE.RIDGE, col(0x5f646c), {});
      mb.box(x - 2.6, 26, 6.6, x + 2.6, 27.6, 9.4, TILE.LIGHT, col(0xfff0c0), { emis: 1 });
    }
    // ogrodzenie
    for (let i = -30; i <= 30; i++) {
      mb.box(i * 10 - 0.16, 0, -150, i * 10 + 0.16, 3, -149.7, TILE.RIDGE, col(0x5a5f66), { uvScale: 1 });
    }
    // wzgórza w tle
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2, d = 620 + rnd() * 520;
      mb.blob(Math.cos(a) * d, -8, Math.sin(a) * d, 60 + rnd() * 90, 0.35, (i * 977) | 0,
        TILE.GRASS, colScale(col(0x53663f), 0.8 + rnd() * 0.4), { stretch: 0.42, seg: 8, rings: 4 });
    }
    return mb;
  }

  buildRocket() {
    const mb = new MeshBuilder();
    const white = col(0xf2f4f6), dark = col(0x2f343c), acc = col(0xd04a3a);
    mb.cylinder(0, 0.055, 0, 0.048, 0.60, 16, TILE.PANEL, white, { uvScale: 1.5 });
    mb.cylinder(0, 0.655, 0, 0.048, 0.055, 16, TILE.RIDGE, dark, {});
    mb.cylinder(0, 0.71, 0, 0.046, 0.16, 16, TILE.PANEL, white, { uvScale: 1.5 });
    mb.cylinder(0, 0.87, 0, 0.046, 0.13, 16, TILE.PANEL, white, { rTop: 0.004 });
    mb.cylinder(0, 0.30, 0, 0.0485, 0.05, 16, TILE.PLAIN, acc, {});
    mb.cylinder(0, 0, 0, 0.036, 0.055, 16, TILE.RIDGE, dark, { rTop: 0.048 });
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      mb.transform(0, 0, 0, a, 1);
      mb.box(-0.012, 0.02, 0.045, 0.012, 0.15, 0.105, TILE.PANEL, col(0xd8dade), { uvScale: 1 });
      mb.resetTransform();
      mb.transform(0, 0, 0, a + 0.78, 1);
      mb.cylinder(0, -0.03, 0.026, 0.016, 0.035, 8, TILE.RIDGE, col(0x22262c), { rTop: 0.024 });
      mb.resetTransform();
    }
    return mb;
  }

  buildFlame() {
    // stożki rosną ku górze (do dyszy) – dzięki temu ścianki są zwrócone na zewnątrz
    const mb = new MeshBuilder();
    mb.cylinder(0, -7.0, 0, 0.06, 7.0, 12, TILE.LIGHT, col(0xff7a2a), { rTop: 1.35, emis: 1, noCap: true });
    mb.cylinder(0, -3.4, 0, 0.05, 3.4, 12, TILE.LIGHT, col(0xffe89a), { rTop: 0.82, emis: 1, noCap: true });
    mb.cylinder(0, -1.5, 0, 0.04, 1.5, 12, TILE.LIGHT, col(0xffffff), { rTop: 0.5, emis: 1, noCap: true });
    return mb;
  }

  buildSmoke() {
    const mb = new MeshBuilder();
    mb.blob(0, 0, 0, 1, 0.4, 33, TILE.PLAIN, col(0xd8d4cc), { seg: 7, rings: 4 });
    return mb;
  }

  buildEarthGlobe() {
    const mb = new MeshBuilder();
    // oś obrotu przechylona, żeby w kadrze był równik, a nie czapa polarna
    const ca = Math.cos(1.35), sa = Math.sin(1.35);
    const colorFn = (nx0, ny0, nz0) => {
      const ny = ny0 * ca - nz0 * sa, nz = ny0 * sa + nz0 * ca, nx = nx0;
      const c1 = fbm(nx * 2.1 + 4, nz * 2.1 + ny * 2.4, 5, 77);
      const land = smoothstep(0.47, 0.53, c1);
      let c = colMix(col(0x1d4d86), col(0x3f7a3a), land);
      c = colMix(c, col(0xa89060), smoothstep(0.62, 0.75, c1) * 0.7);
      const polar = smoothstep(0.74, 0.94, Math.abs(ny));
      c = colMix(c, col(0xf4f8ff), polar);
      const cloud = fbm(nx * 3.4 + 20, nz * 3.4 + ny * 4, 4, 300);
      c = colMix(c, col(0xffffff), smoothstep(0.55, 0.72, cloud) * 0.75);
      return c;
    };
    mb.sphere(0, 0, 0, 1, 48, TILE.PLAIN, col(0x2f6ea0), { colorFn: colorFn });
    return mb;
  }

  buildCapsule() {
    const mb = new MeshBuilder();
    const wall = col(0xb9bfc7), dark = col(0x40464f);
    // wnętrze modułu: podłoga, sufit, ściany
    mb.plane(-2.2, -2.6, 2.2, 2.2, 0, TILE.GRATE, col(0x8d949c), { uvScale: 0.5 });
    mb.plane(-2.2, -2.6, 2.2, 2.2, 2.5, TILE.PANEL, col(0xd8dce2), { down: true, uvScale: 0.4 });
    mb.box(-2.35, 0, -2.75, -2.2, 2.5, 2.36, TILE.PANEL, wall, { uvScale: 0.5 });
    mb.box(2.2, 0, -2.75, 2.35, 2.5, 2.36, TILE.PANEL, wall, { uvScale: 0.5 });
    mb.box(-2.35, 0, -2.9, 2.35, 2.5, -2.75, TILE.PANEL, wall, { uvScale: 0.5 });

    // ściana z okrągłym oknem (z = 2.2)
    const R = 0.78, seg = 24;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      const p0 = [Math.cos(a0) * R, 1.45 + Math.sin(a0) * R], p1 = [Math.cos(a1) * R, 1.45 + Math.sin(a1) * R];
      const b0 = this.squareEdge(Math.cos(a0), Math.sin(a0), 2.35, 1.55);
      const b1 = this.squareEdge(Math.cos(a1), Math.sin(a1), 2.35, 1.55);
      mb.quad([p1[0], p1[1], 2.2], [p0[0], p0[1], 2.2], [b0[0], 1.45 + b0[1], 2.2], [b1[0], 1.45 + b1[1], 2.2],
        TILE.PANEL, wall, { uvScale: 0.5 });
      mb.quad([p0[0], p0[1], 2.35], [p1[0], p1[1], 2.35], [b1[0], 1.45 + b1[1], 2.35], [b0[0], 1.45 + b0[1], 2.35],
        TILE.HULL, col(0x878d95), { uvScale: 0.5 });
      // ościeżnica okna
      mb.quad([p0[0], p0[1], 2.2], [p1[0], p1[1], 2.2], [p1[0], p1[1], 2.35], [p0[0], p0[1], 2.35],
        TILE.HULL, col(0x5c626a), { uvScale: 1 });
    }
    // rama okna
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      const R2 = R + 0.10;
      mb.quad(
        [Math.cos(a1) * R2, 1.45 + Math.sin(a1) * R2, 2.16],
        [Math.cos(a0) * R2, 1.45 + Math.sin(a0) * R2, 2.16],
        [Math.cos(a0) * R, 1.45 + Math.sin(a0) * R, 2.16],
        [Math.cos(a1) * R, 1.45 + Math.sin(a1) * R, 2.16], TILE.HULL, col(0x4e545c), { uvScale: 1 });
    }

    // fotele
    for (const x of [-1.35, -0.45, 0.45, 1.35]) {
      mb.transform(x, 0, -1.75, 0, 1);
      mb.box(-0.32, 0.34, -0.32, 0.32, 0.46, 0.32, TILE.CARPET, col(0xc9ccd2), { uvScale: 1 });
      mb.box(-0.32, 0.46, -0.42, 0.32, 1.32, -0.30, TILE.CARPET, col(0xb4b8c0), { uvScale: 1 });
      mb.box(-0.34, 0, -0.24, -0.24, 0.34, 0.24, TILE.PLAIN, dark, { uvScale: 1 });
      mb.box(0.24, 0, -0.24, 0.34, 0.34, 0.24, TILE.PLAIN, dark, { uvScale: 1 });
      mb.box(-0.38, 0.46, -0.30, -0.30, 0.80, 0.24, TILE.CARPET, col(0xb4b8c0), { uvScale: 1 });
      mb.box(0.30, 0.46, -0.30, 0.38, 0.80, 0.24, TILE.CARPET, col(0xb4b8c0), { uvScale: 1 });
      mb.resetTransform();
    }
    // konsole i wskaźniki
    mb.box(-2.18, 0.75, -1.2, -1.75, 0.95, 1.1, TILE.PANEL, col(0x4b5462), { uvScale: 0.6 });
    mb.box(-2.16, 0.95, -1.1, -1.85, 1.0, 1.0, TILE.LIGHT, col(0x6fb8d8), { emis: 0.4 });
    for (let i = 0; i < 7; i++) {
      mb.box(2.14, 1.1 + (i % 4) * 0.22, -1.4 + Math.floor(i / 4) * 0.7, 2.19, 1.2 + (i % 4) * 0.22, -1.1 + Math.floor(i / 4) * 0.7,
        TILE.LIGHT, i % 3 === 0 ? col(0xff9a6a) : col(0x8fe0b0), { emis: 0.55 });
    }
    // pasy i uchwyty
    for (let i = 0; i < 4; i++) {
      mb.box(-1.9 + i * 1.2, 2.32, -0.4, -1.4 + i * 1.2, 2.40, -0.3, TILE.RIDGE, col(0x6a7078), { uvScale: 1 });
    }
    mb.box(-1.6, 2.36, 0.4, 1.6, 2.46, 0.62, TILE.LIGHT, col(0xffffff), { emis: 0.9 });
    return mb;
  }

  squareEdge(cx, cy, halfW, halfH) {
    const sx = Math.abs(cx) < 1e-5 ? 1e9 : halfW / Math.abs(cx);
    const sy = Math.abs(cy) < 1e-5 ? 1e9 : halfH / Math.abs(cy);
    const s = Math.min(sx, sy);
    return [cx * s, cy * s];
  }

  buildCapsuleGlass() {
    const mb = new MeshBuilder();
    const R = 0.78, seg = 24;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      mb.quad([0, 1.45, 2.27],
        [Math.cos(a0) * R, 1.45 + Math.sin(a0) * R, 2.27],
        [Math.cos(a1) * R, 1.45 + Math.sin(a1) * R, 2.27],
        [0, 1.45, 2.27], TILE.PLAIN, col(0x9fd8f0), { u: 1, v: 1 });
    }
    return mb;
  }

  /* ---------- scenariusz ---------- */
  shots() {
    const IGN = 25.5;   // moment zapłonu (sekundy filmu)
    return [
      {
        scene: 'earth', dur: 7.5, fov: 1.05,
        camFrom: [-40, 34, 320], camTo: [-10, 26, 250],
        lookFrom: [0, 30, 40], lookTo: [0, 26, 40],
        text: 'ARCHIWUM ORBITALNE · ZAPIS 0114-C',
        note: 'MATERIAŁ NIEJAWNY — NIE DO PUBLIKACJI'
      },
      {
        scene: 'earth', dur: 6.5, fov: 0.95,
        camFrom: [-330, 12, 130], camTo: [-120, 14, 130],
        lookFrom: [-260, 30, 40], lookTo: [-60, 32, 40],
        text: '14 marca 2026. Kosmodrom Ostrov, godzina 04:11.',
        note: 'Oficjalny komunikat: start trzech rakiet badawczych.'
      },
      {
        scene: 'earth', dur: 7.0, fov: 1.1,
        camFrom: [200, 18, 150], camTo: [-260, 20, 150],
        lookFrom: [180, 30, 40], lookTo: [-240, 30, 40],
        text: 'Nagranie pokazuje czterdzieści jeden.',
        note: 'Zapis nigdy nie trafił do archiwum publicznego.'
      },
      {
        scene: 'earth', dur: 6.0, fov: 1.0, ignite: IGN,
        camFrom: [-30, 3, 96], camTo: [-30, 5, 88],
        lookFrom: [-26, 26, 40], lookTo: [-26, 40, 40],
        text: 'Na pokładach: dwanaście tysięcy osób.',
        note: 'Lista pasażerów pozostaje utajniona.'
      },
      {
        scene: 'earth', dur: 7.0, fov: 1.15,
        camFrom: [120, 40, 250], camTo: [150, 120, 300],
        lookFrom: [-40, 60, 40], lookTo: [-20, 190, 40],
        text: '04:12. Start.',
        note: null, shake: 0.5
      },
      {
        scene: 'ascent', dur: 8.0, fov: 1.05,
        camFrom: [10, 4, 26], camTo: [22, 10, 44],
        lookFrom: [0, 6, 0], lookTo: [0, 14, 0],
        text: 'Kurs w dokumentach: niska orbita okołoziemska.',
        note: 'Kurs rzeczywisty: poza wszystkie mapy.'
      },
      {
        scene: 'capsule', dur: 8.0, fov: 1.0,
        camFrom: [0.62, 1.62, -1.65], camTo: [0.46, 1.58, -0.30],
        lookFrom: [-0.15, 1.52, 2.30], lookTo: [-0.22, 1.48, 2.30],
        text: 'Ziemia zniknęła z okien po czterech godzinach.',
        note: null
      },
      {
        scene: 'capsule', dur: 9.0, fov: 0.78, tear: true,
        camFrom: [1.50, 1.755, 1.66], camTo: [1.18, 1.725, 1.60],
        lookFrom: [-0.30, 1.658, 1.46], lookTo: [-0.30, 1.662, 1.45],
        text: 'Jedna osoba nie odeszła od okna ani na chwilę.',
        note: null
      },
      {
        scene: 'capsule', dur: 6.5, fov: 0.50, tear: true,
        camFrom: [0.96, 1.712, 1.55], camTo: [0.90, 1.708, 1.54],
        lookFrom: [-0.30, 1.657, 1.45], lookTo: [-0.30, 1.657, 1.45],
        text: 'To byłeś ty.',
        note: 'Zapis urywa się w tym miejscu.'
      }
    ];
  }

  start() {
    this.build();
    this.list = this.shots();
    this.total = this.list.reduce((a, s) => a + s.dur, 0);
    this.t = 0;
    this.shotIdx = -1;
    this.active = true;
    this.rocketSeed = mulberry(31);
    this.igniteAt = 25.5;
    this.rumbled = false;
    document.getElementById('film').classList.add('show');
    document.body.classList.add('cinema');
  }

  stop() {
    this.active = false;
    document.getElementById('film').classList.remove('show');
    document.body.classList.remove('cinema');
  }

  currentShot() {
    let acc = 0;
    for (let i = 0; i < this.list.length; i++) {
      if (this.t < acc + this.list[i].dur) return { s: this.list[i], i: i, local: (this.t - acc) / this.list[i].dur };
      acc += this.list[i].dur;
    }
    return null;
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const cur = this.currentShot();
    if (!cur) { this.finish(); return; }
    if (cur.i !== this.shotIdx) {
      this.shotIdx = cur.i;
      const tx = document.getElementById('filmText');
      tx.innerHTML = '<span class="l1">' + cur.s.text + '</span>' +
        (cur.s.note ? '<span class="l2">' + cur.s.note + '</span>' : '');
      tx.classList.remove('in'); void tx.offsetWidth; tx.classList.add('in');
      this.game.audio.blip(220 + cur.i * 30, 0.09, 0.03, 'square');
    }
    if (!this.rumbled && this.t >= this.igniteAt) {
      this.rumbled = true;
      this.game.audio.noiseBurst(6.5, 90, 40, 0.42, 'lowpass');
      this.game.audio.noiseBurst(5.0, 340, 120, 0.22, 'bandpass');
    }
    // licznik czasu na nagraniu
    const sec = Math.floor(4 * 3600 + 11 * 60 + 38 + this.t);
    const hh = String(Math.floor(sec / 3600) % 24).padStart(2, '0');
    const mm = String(Math.floor(sec / 60) % 60).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    const fr = String(Math.floor((this.t * 24) % 24)).padStart(2, '0');
    document.getElementById('filmTc').textContent = '14.03.2026  ' + hh + ':' + mm + ':' + ss + ':' + fr;
  }

  finish() {
    this.stop();
    this.game.onFilmEnd();
  }

  /* wysokość rakiety nad stanowiskiem */
  rocketAlt(i) {
    const t = this.t - this.igniteAt - i * 0.16;
    if (t <= 0) return 0;
    const a = 7.5;
    return 0.5 * a * t * t;
  }

  render(r) {
    const gl = this.gl, cur = this.currentShot();
    if (!cur) return;
    const s = cur.s, e = smoothstep(0, 1, cur.local);
    const lerp3 = (a, b) => [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e)];
    const pos = lerp3(s.camFrom, s.camTo);
    const look = lerp3(s.lookFrom, s.lookTo);
    if (s.shake) {
      const k = s.shake * 0.35;
      pos[0] += (Math.random() - 0.5) * k; pos[1] += (Math.random() - 0.5) * k;
    }
    const dir = vnorm([look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]]);

    if (s.scene === 'earth') this.renderEarth(r, pos, dir, s);
    else if (s.scene === 'ascent') this.renderAscent(r, pos, dir, s);
    else this.renderCapsule(r, pos, dir, s, cur.local);
  }

  renderEarth(r, pos, dir, s) {
    const gl = this.gl;
    r.clearSky(EARTH_SKY.fogCol);
    r.beginFrame(pos, dir, s.fov, 0.3, 3000);

    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    r.setEnv({ ambient: [1, 1, 1], sunCol: [0, 0, 0], lights: [], fogDensity: 0 });
    r.useMain(true);
    r.draw(this.skyEarth, this.game.mats.model);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); r.clearDepth();

    r.setEnv({
      ambient: [0.46, 0.44, 0.46], sunDir: EARTH_SKY.sunDir, sunCol: [0.72, 0.62, 0.5],
      fogCol: EARTH_SKY.fogCol, fogDensity: 0.00055, headlamp: 0, lights: []
    });
    r.useMain(false);
    r.draw(this.pad, this.game.mats.model);

    const m = this.game.mats.tmp;
    // najpierw dym (półprzezroczysty), potem rakiety i płomienie
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    for (let i = 0; i < 12; i++) {
      const x = -270 + i * 48;
      const alt = this.rocketAlt(i);
      if (alt <= 0) continue;
      // kłąb przy stanowisku
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2;
        r.draw(this.smoke, m4trs(m, x + Math.cos(a) * (9 + k * 2), 2 + (k % 2) * 2, 40 + Math.sin(a) * (9 + k * 2), k, 7 + k * 1.6),
          { alpha: 0.5 });
      }
      // smuga za rakietą
      for (let k = 0; k < 9; k++) {
        const age = k * 0.4;
        const y = Math.max(1.5, 3.4 + alt - age * 24);
        const sc = 3.5 + age * 5.5;
        r.draw(this.smoke, m4trs(m, x + Math.sin(k * 2.7 + i) * age * 2.2, y, 40 + Math.cos(k * 1.9) * age * 2, k, sc),
          { alpha: 0.55 - k * 0.03 });
      }
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    for (let i = 0; i < 12; i++) {
      const x = -270 + i * 48;
      const alt = this.rocketAlt(i);
      r.draw(this.rocket, m4trs(m, x, 3.4 + alt, 40, 0, 55));
      if (alt > 0) {
        const th = 1 + Math.sin(this.t * 30 + i) * 0.10;
        r.draw(this.flame, m4trs(m, x, 3.4 + alt, 40, 0, 3.1 * th), { emisMul: 1.6 });
      }
    }
  }

  renderAscent(r, pos, dir, s) {
    const gl = this.gl, m = this.game.mats.tmp;
    r.clearSky([0, 0, 0]);
    r.beginFrame(pos, dir, s.fov, 0.3, 4000);

    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    r.setEnv({ ambient: [1, 1, 1], sunCol: [0, 0, 0], lights: [], fogDensity: 0 });
    r.useMain(true);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    r.drawStars(this.game.space.starBuf, this.game.space.starCount, gl.POINTS, [0, 0, 1], 0, 1);
    gl.disable(gl.BLEND);
    r.setEnv({ ambient: [0.20, 0.22, 0.28], sunDir: vnorm([0.22, 0.90, 0.32]), sunCol: [1.55, 1.5, 1.4], lights: [], fogDensity: 0 });
    r.useMain(true);
    r.draw(this.earth, m4trs(m, 0, -900, 90, this.t * 0.004, 640));
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); r.clearDepth();

    r.setEnv({ ambient: [0.14, 0.15, 0.2], sunDir: vnorm([0.5, 0.35, 0.7]), sunCol: [1.1, 1.05, 0.95], fogDensity: 0, headlamp: 0, lights: [] });
    r.useMain(false);
    const rise = (this.t - 40) * 1.4;
    for (let i = 0; i < 9; i++) {
      const px = -14 + i * 3.6 + Math.sin(i * 2.1) * 1.4;
      const py = -2 + i * 0.9 + rise * (0.8 + (i % 3) * 0.12);
      const pz = -6 + (i % 4) * 3.5;
      r.draw(this.rocket, m4trs(m, px, py, pz, i, 2.2));
      r.draw(this.flame, m4trs(m, px, py, pz, 0, 0.16 + Math.sin(this.t * 22 + i) * 0.012), { emisMul: 1.8 });
    }
  }

  renderCapsule(r, pos, dir, s, local) {
    const gl = this.gl, m = this.game.mats.tmp;
    r.clearSky([0, 0, 0]);
    r.beginFrame(pos, dir, s.fov, 0.05, 4000);

    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    r.setEnv({ ambient: [1, 1, 1], sunCol: [0, 0, 0], lights: [], fogDensity: 0 });
    r.useMain(true);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    r.drawStars(this.game.space.starBuf, this.game.space.starCount, gl.POINTS, [0, 0, 1], 0, 1);
    gl.disable(gl.BLEND);
    // Ziemia za oknem – oddala się w trakcie sceny
    const shrink = 1 - clamp((this.t - 46) / 26, 0, 0.72);
    r.setEnv({ ambient: [0.16, 0.18, 0.24], sunDir: vnorm([0.30, 0.34, -0.89]), sunCol: [1.5, 1.45, 1.35], lights: [], fogDensity: 0 });
    r.useMain(true);
    r.draw(this.earth, m4trs(m, -62 * shrink, -16 * shrink, 330, this.t * 0.01, 78 * shrink + 6));
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); r.clearDepth();

    const lights = [
      { pos: [0, 2.42, 0.5], col: [0.55, 0.56, 0.62] },
      { pos: [-1.9, 1.2, 0], col: [0.22, 0.34, 0.4] },
      { pos: [0, 1.5, 2.0], col: [0.30, 0.36, 0.46] }
    ];
    r.setEnv({ ambient: [0.20, 0.21, 0.26], sunDir: [0, 1, 0], sunCol: [0, 0, 0], fogCol: [0, 0, 0], fogDensity: 0, headlamp: 0, lights: lights });
    r.useMain(false);
    r.draw(this.capsule, this.game.mats.model);
    // postać stoi przy oknie, twarzą do szyby (+z)
    const sway = Math.sin(this.t * 0.7) * 0.012;
    r.draw(this.person, m4trs(m, -0.30, 0, 1.42 + sway * 0.3, sway, 1));
    if (s.tear) {
      const cyc = ((this.t - 52.5) % 3.6);
      if (cyc > 0) {
        const fall = clamp(cyc / 1.9, 0, 1);
        const y = 1.668 - fall * 0.115;
        r.draw(this.tear, m4trs(m, -0.30 + 0.139, y, 1.42 + 0.070, 0, 1.3), { emisMul: 1.8 });
      }
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    r.draw(this.capsuleGlass, this.game.mats.model, { alpha: 0.10 });
    gl.depthMask(true); gl.disable(gl.BLEND);
  }
}
