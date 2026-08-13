'use strict';
/* ---------- The Ship :: silnik graficzny (WebGL, bez bibliotek) ---------- */

const TILE = {
  HULL: 0, GRATE: 1, PANEL: 2, WOOD: 3,
  CARPET: 4, RIDGE: 5, LIGHT: 6, DOOR: 7,
  GRASS: 8, ROCK: 9, SAND: 10, ICE: 11,
  SOIL: 12, CRYSTAL: 13, LEAF: 14, PLAIN: 15
};

function col(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}
function colMix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function colScale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }

/* ============ ATLAS TEKSTUR (rysowany proceduralnie na canvasie) ============ */
function makeAtlas() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S * 4;
  const g = c.getContext('2d');

  function tile(i, fn) {
    g.save();
    g.translate((i % 4) * S, Math.floor(i / 4) * S);
    g.beginPath(); g.rect(0, 0, S, S); g.clip();
    fn(g, S);
    g.restore();
  }
  function bg(g, S, c0) { g.fillStyle = c0; g.fillRect(0, 0, S, S); }
  function grain(g, S, n, a, spread) {
    for (let i = 0; i < n; i++) {
      const v = Math.floor(128 + (Math.random() - 0.5) * spread);
      g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + a + ')';
      g.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
  }
  function line(g, x0, y0, x1, y1, w, style) {
    g.strokeStyle = style; g.lineWidth = w;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }

  // 0 – poszycie kadłuba
  tile(TILE.HULL, (g, S) => {
    bg(g, S, '#8e949c');
    grain(g, S, 900, 0.07, 90);
    for (let i = 0; i <= 2; i++) {
      line(g, 0, i * S / 2, S, i * S / 2, 3, 'rgba(40,45,52,0.5)');
      line(g, i * S / 2, 0, i * S / 2, S, 3, 'rgba(40,45,52,0.5)');
      line(g, 0, i * S / 2 + 3, S, i * S / 2 + 3, 1.5, 'rgba(220,230,240,0.25)');
    }
    g.fillStyle = 'rgba(35,40,48,0.55)';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.beginPath(); g.arc(16 + x * S / 4, 16 + y * S / 4, 3.5, 0, 7); g.fill();
    }
  });

  // 1 – krata podłogowa
  tile(TILE.GRATE, (g, S) => {
    bg(g, S, '#5a616b');
    grain(g, S, 700, 0.08, 80);
    g.fillStyle = 'rgba(25,29,35,0.85)';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++)
      g.fillRect(x * 32 + 9, y * 32 + 9, 15, 15);
    line(g, 0, 0, S, 0, 5, 'rgba(30,34,40,0.8)');
    line(g, 0, 0, 0, S, 5, 'rgba(30,34,40,0.8)');
  });

  // 2 – jasny panel ścienny
  tile(TILE.PANEL, (g, S) => {
    bg(g, S, '#e6e2da');
    grain(g, S, 500, 0.05, 40);
    g.strokeStyle = 'rgba(120,124,130,0.5)'; g.lineWidth = 2.5;
    g.strokeRect(10, 10, S - 20, S - 20);
    line(g, 0, S / 2, S, S / 2, 2, 'rgba(120,124,130,0.35)');
    line(g, 0, S / 2 + 2, S, S / 2 + 2, 1, 'rgba(255,255,255,0.6)');
  });

  // 3 – ciepłe drewno
  tile(TILE.WOOD, (g, S) => {
    bg(g, S, '#b8875a');
    for (let i = 0; i < 5; i++) line(g, 0, i * S / 4, S, i * S / 4, 3, 'rgba(90,58,32,0.55)');
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * S;
      line(g, 0, y, S, y + (Math.random() - 0.5) * 6, 1 + Math.random() * 2, 'rgba(120,80,45,0.20)');
    }
    grain(g, S, 300, 0.05, 60);
  });

  // 4 – dywan / tkanina
  tile(TILE.CARPET, (g, S) => {
    bg(g, S, '#8b7fa3');
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.10) + ')';
      g.fillRect(Math.random() * S, Math.random() * S, 3, 2);
      g.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.10) + ')';
      g.fillRect(Math.random() * S, Math.random() * S, 2, 3);
    }
  });

  // 5 – żebrowany metal (maszynownia)
  tile(TILE.RIDGE, (g, S) => {
    bg(g, S, '#767c85');
    for (let y = 0; y < S; y += 16) {
      g.fillStyle = 'rgba(30,34,40,0.45)'; g.fillRect(0, y, S, 7);
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(0, y + 7, S, 3);
    }
    grain(g, S, 400, 0.06, 70);
  });

  // 6 – świecący panel
  tile(TILE.LIGHT, (g, S) => {
    const gr = g.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#f4fbff'); gr.addColorStop(1, '#ffffff');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  });

  // 7 – metal drzwi
  tile(TILE.DOOR, (g, S) => {
    bg(g, S, '#aab2bb');
    grain(g, S, 400, 0.06, 60);
    g.fillStyle = 'rgba(45,52,60,0.5)';
    for (let i = 0; i < 5; i++) g.fillRect(0, 40 + i * 36, S, 10);
    g.fillStyle = 'rgba(90,200,235,0.55)';
    g.fillRect(0, S - 26, S, 8);
    g.fillStyle = 'rgba(45,52,60,0.35)'; g.fillRect(S - 12, 0, 12, S);
  });

  // 8 – trawa / obcy mech
  tile(TILE.GRASS, (g, S) => {
    bg(g, S, '#a8c98a');
    for (let i = 0; i < 2600; i++) {
      const v = Math.random();
      g.strokeStyle = 'rgba(' + (60 + v * 90 | 0) + ',' + (110 + v * 90 | 0) + ',' + (50 + v * 60 | 0) + ',0.5)';
      g.lineWidth = 1.6;
      const x = Math.random() * S, y = Math.random() * S;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 6, y - 5 - Math.random() * 7); g.stroke();
    }
  });

  // 9 – skała
  tile(TILE.ROCK, (g, S) => {
    bg(g, S, '#9d968c');
    grain(g, S, 2200, 0.10, 120);
    g.strokeStyle = 'rgba(50,46,42,0.35)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      let x = Math.random() * S, y = Math.random() * S;
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); }
      g.stroke();
    }
  });

  // 10 – piasek
  tile(TILE.SAND, (g, S) => {
    bg(g, S, '#e2c491');
    grain(g, S, 2600, 0.08, 90);
    g.strokeStyle = 'rgba(160,125,80,0.22)'; g.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      const y = Math.random() * S;
      g.moveTo(0, y);
      for (let x = 0; x <= S; x += 32) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 7);
      g.stroke();
    }
  });

  // 11 – lód / śnieg
  tile(TILE.ICE, (g, S) => {
    bg(g, S, '#e8f3fb');
    grain(g, S, 1200, 0.06, 40);
    g.strokeStyle = 'rgba(140,175,205,0.4)'; g.lineWidth = 1.6;
    for (let i = 0; i < 18; i++) {
      let x = Math.random() * S, y = Math.random() * S;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) { x += (Math.random() - 0.5) * 70; y += (Math.random() - 0.5) * 70; g.lineTo(x, y); }
      g.stroke();
    }
  });

  // 12 – gleba
  tile(TILE.SOIL, (g, S) => {
    bg(g, S, '#7d6146');
    grain(g, S, 2600, 0.13, 110);
    g.fillStyle = 'rgba(40,30,20,0.30)';
    for (let i = 0; i < 60; i++) g.fillRect(Math.random() * S, Math.random() * S, 5 + Math.random() * 8, 4 + Math.random() * 6);
  });

  // 13 – kryształ
  tile(TILE.CRYSTAL, (g, S) => {
    bg(g, S, '#cfeeff');
    for (let i = 0; i < 26; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (0.10 + Math.random() * 0.35) + ')';
      g.beginPath();
      const x = Math.random() * S, y = Math.random() * S, r = 20 + Math.random() * 60;
      g.moveTo(x, y - r); g.lineTo(x + r * 0.5, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.5, y);
      g.closePath(); g.fill();
    }
  });

  // 14 – liść / roślina
  tile(TILE.LEAF, (g, S) => {
    bg(g, S, '#77b25e');
    for (let i = 0; i < 200; i++) {
      g.strokeStyle = 'rgba(40,90,45,0.30)'; g.lineWidth = 1.5;
      const x = Math.random() * S, y = Math.random() * S;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40); g.stroke();
    }
    grain(g, S, 400, 0.05, 60);
  });

  // 15 – czysty biały (kolor z wierzchołków)
  tile(TILE.PLAIN, (g, S) => { bg(g, S, '#ffffff'); });

  return c;
}

/* ============ SHADERY ============ */
const VS_MAIN = `
attribute vec3 aPos;
attribute vec3 aNrm;
attribute vec2 aUv;
attribute vec3 aCol;
attribute float aEmis;
attribute float aTile;
uniform mat4 uProj, uView, uModel;
varying vec3 vWorld, vNrm, vCol;
varying vec2 vUv;
varying float vEmis, vTile;
void main(){
  vec4 w = uModel * vec4(aPos, 1.0);
  vWorld = w.xyz;
  vNrm = mat3(uModel) * aNrm;
  vUv = aUv; vCol = aCol; vEmis = aEmis; vTile = aTile;
  gl_Position = uProj * uView * w;
}`;

const FS_MAIN = `
precision highp float;
varying vec3 vWorld, vNrm, vCol;
varying vec2 vUv;
varying float vEmis, vTile;
uniform sampler2D uTex;
uniform vec3 uAmbient, uSunDir, uSunCol, uFogCol, uCamPos;
uniform float uFogDensity, uAlpha, uEmisMul, uHeadlamp, uTone;
uniform vec3 uLightPos[8];
uniform vec3 uLightCol[8];
uniform int uLightCount;
void main(){
  float t = floor(vTile + 0.5);
  vec2 org = vec2(mod(t, 4.0), floor(t / 4.0));
  vec2 uv = (org + 0.015 + fract(vUv) * 0.97) * 0.25;
  vec4 tex = texture2D(uTex, uv);
  vec3 base = tex.rgb * vCol;
  vec3 n = normalize(vNrm);
  vec3 toCam = uCamPos - vWorld;
  float camDist = length(toCam);
  vec3 light = uAmbient + uSunCol * max(dot(n, uSunDir), 0.0);
  for (int i = 0; i < 8; i++) {
    if (i >= uLightCount) break;
    vec3 d = uLightPos[i] - vWorld;
    float dist = length(d);
    float att = 1.0 / (1.0 + 0.22 * dist + 0.055 * dist * dist);
    light += uLightCol[i] * max(dot(n, d / max(dist, 0.001)), 0.0) * att;
  }
  light += vec3(uHeadlamp) * max(dot(n, toCam / max(camDist, 0.001)), 0.0) / (1.0 + 0.09 * camDist * camDist);
  vec3 c = base * light + base * vEmis * uEmisMul * 1.15 + vec3(vEmis * uEmisMul * 0.12);
  c = mix(c, vec3(1.0) - exp(-c * 1.35), uTone);
  float fog = 1.0 - exp(-uFogDensity * camDist);
  c = mix(c, uFogCol, clamp(fog, 0.0, 1.0));
  gl_FragColor = vec4(c, uAlpha);
}`;

const VS_STAR = `
attribute vec3 aPos;
attribute vec3 aCol;
attribute float aSize;
attribute float aStretch;
uniform mat4 uProj, uView;
uniform vec3 uWarpDir;
uniform float uWarpLen;
varying vec3 vCol;
void main(){
  vec3 p = aPos - uWarpDir * (uWarpLen * aStretch);
  vCol = aCol;
  gl_Position = uProj * uView * vec4(p, 1.0);
  gl_PointSize = aSize;
}`;

const FS_STAR = `
precision mediump float;
varying vec3 vCol;
uniform float uAlpha;
void main(){
  vec2 d = gl_PointCoord - vec2(0.5);
  float a = smoothstep(0.5, 0.05, length(d));
  gl_FragColor = vec4(vCol, uAlpha * a);
}`;

/* ============ BUDOWNICZY SIATEK ============ */
class MeshBuilder {
  constructor() {
    this.v = [];
    this.idx = [];
    this.n = 0;
    this.tx = 0; this.ty = 0; this.tz = 0;
    this.tc = 1; this.ts = 0;
    this.scale = 1;
  }

  /* ustawia transformację dla kolejnych elementów */
  transform(px, py, pz, yaw, scale) {
    this.tx = px || 0; this.ty = py || 0; this.tz = pz || 0;
    this.tc = Math.cos(yaw || 0); this.ts = Math.sin(yaw || 0);
    this.scale = scale === undefined ? 1 : scale;
    return this;
  }
  resetTransform() { return this.transform(0, 0, 0, 0, 1); }

  vertex(x, y, z, nx, ny, nz, u, vv, c, emis, tile) {
    const s = this.scale, cs = this.tc, sn = this.ts;
    const px = (x * cs + z * sn) * s + this.tx;
    const py = y * s + this.ty;
    const pz = (-x * sn + z * cs) * s + this.tz;
    const rnx = nx * cs + nz * sn;
    const rnz = -nx * sn + nz * cs;
    this.v.push(px, py, pz, rnx, ny, rnz, u, vv, c[0], c[1], c[2], emis, tile);
    return this.n++;
  }

  /* czworokąt a->b->c->d (przeciwnie do ruchu wskazówek patrząc z przodu) */
  quad(a, b, c, d, tile, color, o) {
    o = o || {};
    const emis = o.emis || 0;
    const sc = o.uvScale === undefined ? 0.5 : o.uvScale;
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1];
    let ny = e1[2] * e2[0] - e1[0] * e2[2];
    let nz = e1[0] * e2[1] - e1[1] * e2[0];
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const uL = (o.u === undefined ? Math.hypot(e1[0], e1[1], e1[2]) * sc : o.u);
    const vL = (o.v === undefined ? Math.hypot(e2[0], e2[1], e2[2]) * sc : o.v);
    const cc = color;
    const i0 = this.vertex(a[0], a[1], a[2], nx, ny, nz, 0, 0, cc, emis, tile);
    const i1 = this.vertex(b[0], b[1], b[2], nx, ny, nz, uL, 0, cc, emis, tile);
    const i2 = this.vertex(c[0], c[1], c[2], nx, ny, nz, uL, vL, cc, emis, tile);
    const i3 = this.vertex(d[0], d[1], d[2], nx, ny, nz, 0, vL, cc, emis, tile);
    this.idx.push(i0, i1, i2, i0, i2, i3);
    return this;
  }

  /* prostopadłościan od min do max */
  box(x0, y0, z0, x1, y1, z1, tile, color, o) {
    o = o || {};
    const f = o.faces || {};
    const t = (k) => (f[k] === undefined ? tile : f[k]);
    const c = (k) => (o.colors && o.colors[k] ? o.colors[k] : color);
    const skip = o.skip || {};
    if (!skip.pz) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], t('pz'), c('pz'), o);
    if (!skip.nz) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], t('nz'), c('nz'), o);
    if (!skip.px) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], t('px'), c('px'), o);
    if (!skip.nx) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], t('nx'), c('nx'), o);
    if (!skip.py) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], t('py'), c('py'), o);
    if (!skip.ny) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], t('ny'), c('ny'), o);
    return this;
  }

  /* prostopadłościan wg środka i rozmiaru */
  boxAt(cx, cy, cz, sx, sy, sz, tile, color, o) {
    return this.box(cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2, tile, color, o);
  }

  /* pozioma płaszczyzna skierowana w górę (lub w dół) */
  plane(x0, z0, x1, z1, y, tile, color, o) {
    o = o || {};
    if (o.down) this.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], tile, color, o);
    else this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], tile, color, o);
    return this;
  }

  cylinder(cx, cy, cz, r, h, seg, tile, color, o) {
    o = o || {};
    const rTop = o.rTop === undefined ? r : o.rTop;
    const emis = o.emis || 0;
    const capCol = o.capColor || color;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      // kolejność a→b w górę, a→d wokół osi: normalna wychodzi na zewnątrz
      this.quad(
        [cx + c0 * r, cy, cz + s0 * r],
        [cx + c0 * rTop, cy + h, cz + s0 * rTop],
        [cx + c1 * rTop, cy + h, cz + s1 * rTop],
        [cx + c1 * r, cy, cz + s1 * r],
        tile, color, { emis: emis, uvScale: o.uvScale });
      if (!o.noCap) {
        // góra
        const iA = this.vertex(cx, cy + h, cz, 0, 1, 0, 0.5, 0.5, capCol, emis, tile);
        const iB = this.vertex(cx + c0 * rTop, cy + h, cz + s0 * rTop, 0, 1, 0, 0, 0, capCol, emis, tile);
        const iC = this.vertex(cx + c1 * rTop, cy + h, cz + s1 * rTop, 0, 1, 0, 1, 0, capCol, emis, tile);
        this.idx.push(iA, iC, iB);
        const jA = this.vertex(cx, cy, cz, 0, -1, 0, 0.5, 0.5, capCol, emis, tile);
        const jB = this.vertex(cx + c1 * r, cy, cz + s1 * r, 0, -1, 0, 1, 0, capCol, emis, tile);
        const jC = this.vertex(cx + c0 * r, cy, cz + s0 * r, 0, -1, 0, 0, 0, capCol, emis, tile);
        this.idx.push(jA, jB, jC);
      }
    }
    return this;
  }

  sphere(cx, cy, cz, r, seg, tile, color, o) {
    o = o || {};
    const emis = o.emis || 0;
    const rings = Math.max(3, Math.floor(seg / 2));
    const colorFn = o.colorFn;
    const start = this.n;
    for (let y = 0; y <= rings; y++) {
      const phi = y / rings * Math.PI;
      for (let x = 0; x <= seg; x++) {
        const th = x / seg * Math.PI * 2;
        const nx = Math.sin(phi) * Math.cos(th), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(th);
        const cc = colorFn ? colorFn(nx, ny, nz) : color;
        const sy = o.squash === undefined ? 1 : o.squash;
        this.vertex(cx + nx * r, cy + ny * r * sy, cz + nz * r, nx, ny, nz, x / seg * (o.uRep || 2), y / rings * (o.vRep || 1), cc, emis, tile);
      }
    }
    for (let y = 0; y < rings; y++) {
      for (let x = 0; x < seg; x++) {
        const a = start + y * (seg + 1) + x, b = a + seg + 1;
        this.idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    return this;
  }

  /* nieregularny głaz / kryształ – losowo zdeformowana bryła */
  blob(cx, cy, cz, r, rough, seed, tile, color, o) {
    o = o || {};
    const rnd = mulberry(seed);
    const seg = o.seg || 7, rings = o.rings || 4;
    const start = this.n;
    const stretch = o.stretch || 1;
    const rad = [];
    for (let y = 0; y <= rings; y++) {
      rad[y] = [];
      for (let x = 0; x <= seg; x++) rad[y][x] = 1 + (rnd() - 0.5) * rough;
      rad[y][seg] = rad[y][0];
    }
    for (let y = 0; y <= rings; y++) {
      const phi = y / rings * Math.PI;
      for (let x = 0; x <= seg; x++) {
        const th = x / seg * Math.PI * 2;
        const rr = r * rad[y][x];
        const nx = Math.sin(phi) * Math.cos(th), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(th);
        this.vertex(cx + nx * rr, cy + ny * rr * stretch, cz + nz * rr, nx, ny, nz, x * 0.7, y * 0.7, color, o.emis || 0, tile);
      }
    }
    for (let y = 0; y < rings; y++) for (let x = 0; x < seg; x++) {
      const a = start + y * (seg + 1) + x, b = a + seg + 1;
      this.idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    return this;
  }

  /* dwa skrzyżowane prostokąty – trawa, listki */
  cross(cx, cy, cz, w, h, tile, color, o) {
    o = o || {};
    const opt = { emis: o.emis || 0, u: 1, v: 1 };
    this.quad([cx - w / 2, cy, cz], [cx + w / 2, cy, cz], [cx + w / 2, cy + h, cz], [cx - w / 2, cy + h, cz], tile, color, opt);
    this.quad([cx + w / 2, cy, cz], [cx - w / 2, cy, cz], [cx - w / 2, cy + h, cz], [cx + w / 2, cy + h, cz], tile, color, opt);
    this.quad([cx, cy, cz - w / 2], [cx, cy, cz + w / 2], [cx, cy + h, cz + w / 2], [cx, cy + h, cz - w / 2], tile, color, opt);
    this.quad([cx, cy, cz + w / 2], [cx, cy, cz - w / 2], [cx, cy + h, cz - w / 2], [cx, cy + h, cz + w / 2], tile, color, opt);
    return this;
  }

  /* prostopadłościan biegnący wzdłuż dowolnego kierunku (dx,dy,dz) o zadanej długości –
     do elementów, które trzeba przechylić (np. lunety), a nie da się tego zrobić samym yaw */
  beam(cx, cy, cz, dx, dy, dz, len, w, h, tile, color, o) {
    o = o || {};
    const emis = o.emis || 0;
    let dl = Math.hypot(dx, dy, dz) || 1;
    const d = [dx / dl, dy / dl, dz / dl];
    let up = Math.abs(d[1]) > 0.98 ? [1, 0, 0] : [0, 1, 0];
    let rx = up[1] * d[2] - up[2] * d[1], ry = up[2] * d[0] - up[0] * d[2], rz = up[0] * d[1] - up[1] * d[0];
    const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    const ux = d[1] * rz - d[2] * ry, uy = d[2] * rx - d[0] * rz, uz = d[0] * ry - d[1] * rx;
    const p0 = [cx, cy, cz], p1 = [cx + d[0] * len, cy + d[1] * len, cz + d[2] * len];
    const hw = w / 2, hh = h / 2;
    const corner = (p, ru, ud) => [p[0] + rx * ru + ux * ud, p[1] + ry * ru + uy * ud, p[2] + rz * ru + uz * ud];
    const a0 = corner(p0, -hw, -hh), a1 = corner(p0, hw, -hh), a2 = corner(p0, hw, hh), a3 = corner(p0, -hw, hh);
    const b0 = corner(p1, -hw, -hh), b1 = corner(p1, hw, -hh), b2 = corner(p1, hw, hh), b3 = corner(p1, -hw, hh);
    const opt = { emis: emis, uvScale: o.uvScale };
    this.quad(a0, b0, b1, a1, tile, color, opt);
    this.quad(a1, b1, b2, a2, tile, color, opt);
    this.quad(a2, b2, b3, a3, tile, color, opt);
    this.quad(a3, b3, b0, a0, tile, color, opt);
    if (!o.noCap) {
      this.quad(a3, a2, a1, a0, tile, color, opt);
      this.quad(b0, b1, b2, b3, tile, color, opt);
    }
    return this;
  }

  isEmpty() { return this.idx.length === 0; }
}

/* ============ SIATKA GPU ============ */
class Mesh {
  constructor(gl, builder, mode) {
    this.gl = gl;
    this.mode = mode || gl.TRIANGLES;
    this.vbo = gl.createBuffer();
    this.ibo = gl.createBuffer();
    this.count = 0;
    this.indexType = gl.UNSIGNED_SHORT;
    if (builder) this.update(builder);
  }
  update(b) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(b.v), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    const useInt = b.n > 65000;
    if (useInt && Renderer.uint32) {
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(b.idx), gl.STATIC_DRAW);
      this.indexType = gl.UNSIGNED_INT;
    } else {
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(b.idx), gl.STATIC_DRAW);
      this.indexType = gl.UNSIGNED_SHORT;
      if (useInt) console.warn('Za dużo wierzchołków dla indeksów 16-bit:', b.n);
    }
    this.count = b.idx.length;
  }
  dispose() {
    this.gl.deleteBuffer(this.vbo);
    this.gl.deleteBuffer(this.ibo);
    this.count = 0;
  }
}

/* ============ RENDERER ============ */
class Renderer {
  constructor(canvas) {
    const opts = { antialias: true, alpha: false, powerPreference: 'high-performance' };
    let gl = canvas.getContext('webgl2', opts);
    Renderer.uint32 = !!gl;
    if (!gl) {
      gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
      if (gl) Renderer.uint32 = !!gl.getExtension('OES_element_index_uint');
    }
    if (!gl) throw new Error('Brak WebGL');
    this.gl = gl;
    this.canvas = canvas;

    this.progMain = this.program(VS_MAIN, FS_MAIN);
    this.progStar = this.program(VS_STAR, FS_STAR);

    this.proj = m4();
    this.view = m4();
    this.skyView = m4();
    this.model = m4identity(m4());

    this.tex = this.texture(makeAtlas());

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0, 0, 0, 1);

    this.env = {
      ambient: [0.35, 0.36, 0.4],
      sunDir: vnorm([0.4, 0.8, 0.3]),
      sunCol: [0.7, 0.68, 0.62],
      fogCol: [0, 0, 0],
      fogDensity: 0,
      headlamp: 0,
      lights: []
    };
    this.lightPos = new Float32Array(24);
    this.lightCol = new Float32Array(24);
  }

  program(vsSrc, fsSrc) {
    const gl = this.gl;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Program: ' + gl.getProgramInfoLog(p));
    const o = { p: p, a: {}, u: {} };
    const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < na; i++) { const info = gl.getActiveAttrib(p, i); o.a[info.name] = gl.getAttribLocation(p, info.name); }
    const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < nu; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace('[0]', '');
      o.u[name] = gl.getUniformLocation(p, name);
    }
    return o;
  }

  texture(canvas) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.aspect = this.canvas.width / Math.max(1, this.canvas.height);
  }

  beginFrame(camPos, camDir, fov, near, far) {
    const gl = this.gl;
    this.resize();
    this.camPos = camPos;
    m4perspective(this.proj, fov, this.aspect, near || 0.06, far || 900);
    m4lookAt(this.view, camPos, [camPos[0] + camDir[0], camPos[1] + camDir[1], camPos[2] + camDir[2]], [0, 1, 0]);
    m4lookAt(this.skyView, [0, 0, 0], camDir, [0, 1, 0]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  clearSky(c) { this.gl.clearColor(c[0], c[1], c[2], 1); }
  clearDepth() { this.gl.clear(this.gl.DEPTH_BUFFER_BIT); }

  /* rzutuje punkt świata na piksele CSS canvasu (do etykiet HTML nad graczami itp.) */
  project(p) {
    const vp = this._vp || (this._vp = m4());
    m4mul(vp, this.proj, this.view);
    const x = p[0], y = p[1], z = p[2];
    const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
    const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (cw <= 0.0001) return null;
    const sx = (cx / cw * 0.5 + 0.5) * this.canvas.clientWidth;
    const sy = (1 - (cy / cw * 0.5 + 0.5)) * this.canvas.clientHeight;
    return [sx, sy, cw];
  }

  setEnv(e) {
    const env = this.env;
    for (const k in e) env[k] = e[k];
  }

  useMain(sky) {
    const gl = this.gl, pr = this.progMain, env = this.env;
    gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uProj, false, this.proj);
    gl.uniformMatrix4fv(pr.u.uView, false, sky ? this.skyView : this.view);
    gl.uniform3fv(pr.u.uAmbient, env.ambient);
    gl.uniform3fv(pr.u.uSunDir, env.sunDir);
    gl.uniform3fv(pr.u.uSunCol, env.sunCol);
    gl.uniform3fv(pr.u.uFogCol, env.fogCol);
    gl.uniform1f(pr.u.uFogDensity, sky ? 0 : env.fogDensity);
    gl.uniform1f(pr.u.uHeadlamp, sky ? 0 : env.headlamp);
    gl.uniform1f(pr.u.uTone, sky ? 0 : 1);
    gl.uniform3fv(pr.u.uCamPos, sky ? [0, 0, 0] : this.camPos);
    // 8 najbliższych świateł
    const cam = this.camPos;
    let lights = env.lights;
    if (!sky && lights.length > 8) {
      lights = lights.slice().sort((a, b) => {
        const da = (a.pos[0] - cam[0]) ** 2 + (a.pos[1] - cam[1]) ** 2 + (a.pos[2] - cam[2]) ** 2;
        const db = (b.pos[0] - cam[0]) ** 2 + (b.pos[1] - cam[1]) ** 2 + (b.pos[2] - cam[2]) ** 2;
        return da - db;
      }).slice(0, 8);
    }
    const n = sky ? 0 : Math.min(8, lights.length);
    for (let i = 0; i < n; i++) {
      this.lightPos[i * 3] = lights[i].pos[0];
      this.lightPos[i * 3 + 1] = lights[i].pos[1];
      this.lightPos[i * 3 + 2] = lights[i].pos[2];
      this.lightCol[i * 3] = lights[i].col[0];
      this.lightCol[i * 3 + 1] = lights[i].col[1];
      this.lightCol[i * 3 + 2] = lights[i].col[2];
    }
    gl.uniform3fv(pr.u.uLightPos, this.lightPos);
    gl.uniform3fv(pr.u.uLightCol, this.lightCol);
    gl.uniform1i(pr.u.uLightCount, n);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(pr.u.uTex, 0);
    this.curProg = pr;
  }

  draw(mesh, model, o) {
    if (!mesh || !mesh.count) return;
    o = o || {};
    const gl = this.gl, pr = this.curProg || this.progMain;
    gl.uniformMatrix4fv(pr.u.uModel, false, model || this.model);
    gl.uniform1f(pr.u.uAlpha, o.alpha === undefined ? 1 : o.alpha);
    gl.uniform1f(pr.u.uEmisMul, o.emisMul === undefined ? 1 : o.emisMul);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    const S = 52;
    const bind = (name, size, off) => {
      const loc = pr.a[name];
      if (loc === undefined || loc < 0) return;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, S, off);
    };
    bind('aPos', 3, 0); bind('aNrm', 3, 12); bind('aUv', 2, 24);
    bind('aCol', 3, 32); bind('aEmis', 1, 44); bind('aTile', 1, 48);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
    gl.drawElements(mesh.mode, mesh.count, mesh.indexType, 0);
  }

  drawStars(starBuf, count, mode, warpDir, warpLen, alpha) {
    const gl = this.gl, pr = this.progStar;
    gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uProj, false, this.proj);
    gl.uniformMatrix4fv(pr.u.uView, false, this.skyView);
    gl.uniform3fv(pr.u.uWarpDir, warpDir || [0, 0, 1]);
    gl.uniform1f(pr.u.uWarpLen, warpLen || 0);
    gl.uniform1f(pr.u.uAlpha, alpha === undefined ? 1 : alpha);
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
    const S = 32;
    const bind = (name, size, off) => {
      const loc = pr.a[name];
      if (loc === undefined || loc < 0) return;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, S, off);
    };
    bind('aPos', 3, 0); bind('aCol', 3, 12); bind('aSize', 1, 24); bind('aStretch', 1, 28);
    gl.drawArrays(mode, 0, count);
    this.curProg = null;
  }
}
Renderer.uint32 = false;
