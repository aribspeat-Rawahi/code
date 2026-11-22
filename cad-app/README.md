# Nirman CAD

3D CAD desktop app for architecture/building and mechanical design.
Electron + React + Three.js. Internal unit: millimetres, Z-up.

## Run
```bash
npm install
npm run electron:dev   # dev window with hot reload
npm run dist:win       # Windows installer -> release/
```
Windows installers are also built by GitHub Actions (`.github/workflows/build-windows.yml`).

## Commands (type in the command line, `Space` focuses it)
| Command | Example |
|---|---|
| `BOX w d h [x y z]` | `BOX 100 50 30` |
| `CYL r h`, `SPHERE r`, `CONE r h` | `CYL 25 80` |
| `WALL x1 y1 x2 y2 [thickness] [height]` | `WALL 0 0 5000 0 200 2700` |
| `POLY h x1 y1 x2 y2 x3 y3 ...` | `POLY 100 0 0 300 0 150 200` |
| `SKETCH`, then `x y` / `@dx dy`, Enter to extrude | `@1000 0` |
| `HEIGHT h` | extrude height for sketches |
| `MOVE`, `MOVETO`, `ROTATE deg [X/Y/Z]`, `COPY`, `DEL`, `SELECT`, `LIST` | |
| `UNITS mm/cm/m`, `SNAP on/off/step` | `SNAP 50` |
| `NEW`, `OPEN`, `SAVE`, `EXPORT stl/obj` | |

Shortcuts: `W/E/R` move/rotate/scale, `S` sketch, `F9` snap, `Ctrl+Z/Y`, `Ctrl+S/O/N`.
Sketch: click points, `Shift` locks to 90°, click first point or `Enter` to close.

## Booleans (non-destructive)
Select the base first, then Ctrl+click the tools, then **Union / Subtract / Intersect** (or type `SUBTRACT`).
Parts stay editable: click a part in the Objects tree and change its size — the result rebuilds.
Hide a part (eye icon) to suppress that cut. `EXPLODE` splits a boolean back into its parts.
Tip: `SELECT Wall 1, Door 1` then `SUBTRACT` cuts a door opening.

## Object snap & Move by points
- Object snap (OSnap, `F3`): green = Endpoint (corner), blue = Midpoint (edge middle), pink = Center (axis/hole centre, object centre).
- Works in Sketch (draw along existing walls) and in **Move ⇢** (`M`, or `MOVE` with no arguments):
  select objects → click a base point → click the target point. You can also type `x y z` or `@dx dy dz`.
- Example: select a door box, `M`, click its bottom corner, click the wall corner — it lands exactly there.

## Measure & dimensions
- **Dist** (`Q`, or `DIST`): click two points → distance, ΔX/ΔY/ΔZ in the command log. Typed: `DIST 0 0 3000 4000`.
- **Dim** (`D`, or `DIM`): click point 1, point 2, then where the dimension line goes. Typed (plan): `DIM x1 y1 x2 y2 [offset]`.
- **Auto dim** (`AUTODIM`): width, depth and height of the selected object.
- Dimensions are saved with the project, follow the unit setting, and are skipped by STL/OBJ export.
  They record fixed points (not linked to objects): if an object changes, re-dimension it.
- File actions (New/Open/Save/Export) are under **File ▾**.
