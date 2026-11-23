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
- Object snap (OSnap, `F3`): green = Endpoint (corner), blue = Midpoint (edge middle), pink = Center (axis/hole centre, object centre),
  amber = Intersection (two edges cross — apparent intersection in Top/Front/Side views, true 3D crossing in perspective),
  violet = Nearest (closest point on an edge; used when no other snap is within reach).
- Turn modes on/off from **OSnap ▾** in the status bar, or `OSNAP end|mid|cen|int|near on|off`; `OSNAP` lists them.
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

## Views
View bar (top-left of the viewport) or keys: `1` Top · `2` Front · `3` Right · `4` Left · `5` Back · `0` Iso · `P` ortho/persp · `F` fit.
- Top/Front/Side open in **orthographic** (true lengths). Rotation is locked and left-drag pans, like a 2D drafting view.
- The work plane follows the view: XY in plan, XZ in front/back, YZ in side views — so Move/Dist/Dim clicks land on that plane.
- Sketch always draws on the ground: starting it from an elevation switches to Top.
- Commands: `VIEW top|front|right|left|back|iso`, `ORTHO`, `PERSP`, `ZOOM` / `FIT`.

## DXF export (2D drawings)
**File ▾ → Export DXF (this view)** or `DXF [top|front|right|left|back]` (default: the current view; from Iso it exports Top).
- DXF R12 (AC1009), millimetres (`$INSUNITS` = 4) — opens in AutoCAD, LibreCAD, QCAD, DraftSight, BricsCAD, Inkscape.
- Layers: `VISIBLE` (continuous), `HIDDEN` (dashed — e.g. door jambs under the wall top in plan, holes in an elevation), `DIMENSIONS`.
- Lines are the model's hard edges plus silhouettes for that view; hidden parts are found by ray tests against the model.
- Dimension text uses the unit chosen in the app; geometry is always in mm.

## Layers
Layers panel (bottom-left): `+ Layer`, click a name to make it **current** (new objects go there), double-click to rename,
👁 show/hide, 🔒 lock, × delete (objects move to layer `0`; layer `0` can't be deleted). Colour swatch = DXF layer colour.
- Hidden layers are not drawn, snapped to, fitted, or exported (STL/OBJ/DXF).
- Locked layers stay visible and snappable but can't be selected, moved or deleted — handy for a reference plan.
- Move objects: Properties → Layer, or `CHLAYER name`.
- Commands: `LAYER NEW|SET|ON|OFF|LOCK|UNLOCK|DEL name`, `LAYER LIST`.
- DXF export writes one DXF layer per app layer (plus a dashed `NAME_HIDDEN` layer), colour mapped to the nearest ACI.

## Copy & Array
- **Copy ⇢** (`C`, or `COPY` with no arguments): click a base point, then click each place for a copy (object snap works); `Esc` ends.
  `COPY dx dy [dz]` copies by a typed offset.
- **Array** (`A`, or `ARRAY`): panel with a live preview, applied as one undo step.
  - Rectangular: columns × rows × levels with X/Y/Z spacing — e.g. a column grid: `ARRAY RECT 4 3 3000 4000`.
  - Polar: count, sweep angle, centre (type it or **Pick centre in view** and snap to a Center), optional rotation —
    e.g. a 6-hole bolt circle around the origin: `ARRAY POLAR 6 360 0 0`, then select the plate + holes → Subtract.
- Copies are independent objects (up to 2000 per array) on the source's layer; locked layers and dimensions are skipped.
