# Silnik (engine/)

Ten folder to samodzielny, generyczny silnik WebGL — bez żadnych zależności od
kodu gry "The Ship". Nie importuje niczego z `game/`, więc możesz go skopiować
w całości do nowego projektu.

## Zawartość

- **math.js** — macierze 4×4 (`m4*`), wektory, `lerp`/`clamp`/`smoothstep`/`damp`,
  deterministyczny szum (`valueNoise`, `fbm`) i generator liczb losowych (`mulberry`).
- **gfx.js** — cały silnik graficzny:
  - `MeshBuilder` — buduje geometrię (`box`, `quad`, `cylinder`, `sphere`, `blob`,
    `cross`, `beam`) i pakuje ją w tablice wierzchołków/indeksów.
  - `Mesh` — bufor GPU zbudowany z `MeshBuilder`.
  - `Renderer` — inicjalizuje WebGL, kompiluje shadery, rysuje siatki, gwiazdy,
    liczy `project()` (rzut punktu 3D na piksele CSS — przydatne do etykiet HTML).
  - `makeAtlas()` — domyślny atlas tekstur rysowany proceduralnie na canvasie
    (16 kafelków: metal, trawa, piasek, lód, drewno itd.) — możesz podmienić
    kafelki albo dorysować własne, atlas jest zwykłym 2D-canvasem.
- **audio.js** — klasa `Audio`: kontekst Web Audio, ambient/muzyka generowana
  proceduralnie, oraz podstawowe prymitywy dźwiękowe (`blip`, `noiseBurst`, `pad`)
  plus gotowe efekty (otwieranie drzwi, kroki, UI, warp) — usuń/dodaj wedle potrzeb.
- **input.js** — klasa `TouchInput`: gest pełnego ekranu, blokada orientacji
  pozioméj, wirtualny joystick, patrzenie przeciągnięciem palca, przyciski
  dotykowe. Wymaga obiektu "host" opisanego w komentarzu na górze pliku.

## Użycie w nowym projekcie

1. Skopiuj cały folder `engine/` do nowego projektu.
2. Dołącz skrypty w tej kolejności (to zwykłe `<script>`, bez modułów/bundlera):
   ```html
   <script src="engine/math.js"></script>
   <script src="engine/gfx.js"></script>
   <script src="engine/audio.js"></script>
   <script src="engine/input.js"></script>
   <script src="twoja-gra.js"></script>
   ```
3. W swojej grze:
   ```js
   const canvas = document.getElementById('glcanvas');
   const r = new Renderer(canvas);
   const mb = new MeshBuilder();
   mb.box(-1,0,-1, 1,2,1, TILE.PANEL, col(0xffffff), {});
   const mesh = new Mesh(r.gl, mb);

   function frame() {
     r.beginFrame(eyePos, lookDir, fov, 0.06, 900);
     r.setEnv({ ambient:[.3,.3,.35], sunDir:[.4,.8,.3], sunCol:[.8,.8,.7], lights: [] });
     r.useMain(false);
     r.draw(mesh, m4identity(m4()));
     requestAnimationFrame(frame);
   }
   ```
4. Dźwięk: `const audio = new Audio(); audio.start();` (wymaga gestu użytkownika —
   wywołaj `start()` w handlerze kliknięcia).
5. Sterowanie dotykowe: `new TouchInput(hostObject)` — patrz wymagany kształt
   `host` w komentarzu na górze `input.js`.

## Czego tu NIE ma

Układ statku, planety, fabuła, budowanie, multiplayer (`net.js`) — to wszystko
jest w `game/` i jest specyficzne dla "The Ship". Silnik o tym nic nie wie.
