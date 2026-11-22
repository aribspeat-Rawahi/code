import { useScene, type CadObject, type Vec3 } from '../store/sceneStore';
import { findObject, flatten } from '../store/tree';
import { exportModel, newProject, openProject, saveProject } from '../io/files';
import { DEG2RAD, fromDisplay, toDisplay, type Unit } from '../units';
import { wallPoints, profileFromPoints, type Pt } from './sketch';

const HELP = [
  'Lengths use the current unit. Commas or spaces separate numbers.',
  'BOX w d h [x y z]     CYL r h [x y z]     SPHERE r [x y z]     CONE r h [x y z]',
  'WALL x1 y1 x2 y2 [thickness] [height]     POLY h x1 y1 x2 y2 x3 y3 ...',
  'SKETCH  then click points, or type  x y  /  @dx dy ;  Enter or CLOSE to extrude, CANCEL to stop',
  'HEIGHT h  (extrude height for sketches)',
  'MOVE dx dy dz   MOVETO x y z   ROTATE deg [X|Y|Z]   COPY [dx dy dz]   DEL   SELECT name   LIST',
  'UNION  SUBTRACT  INTERSECT  (on the selection; first selected = base)   EXPLODE',
  'SELECT name[, name2, ...]  selects several, in order (e.g. SELECT Wall 1, Box 1)',
  'UNDO  REDO  UNITS mm|cm|m  SNAP on|off|step  NEW  OPEN  SAVE  EXPORT stl|obj',
];

const WALL_THICKNESS = 200; // mm
const WALL_HEIGHT = 2700; // mm

const fmt = (mm: number, unit: Unit) => `${toDisplay(mm, unit)} ${unit}`;

export async function runCommand(raw: string): Promise<void> {
  const st = useScene.getState;
  const print = (m: string) => st().print(m);
  const line = raw.trim();

  // Empty Enter while sketching closes the profile
  if (!line) {
    if (st().tool === 'sketch' && st().sketchPoints.length) st().finishSketch();
    return;
  }
  print(`> ${line}`);

  let tokens = line.split(/[\s,]+/).filter(Boolean);
  // While sketching, bare numbers are an absolute point: "1000 0"
  if (st().tool === 'sketch' && /^-?[\d.]/.test(tokens[0])) tokens = ['P', ...tokens];
  // "@dx,dy" or "@ dx dy" -> relative point
  if (tokens[0].startsWith('@')) {
    const rest = tokens[0].slice(1);
    tokens = ['@', ...(rest ? [rest] : []), ...tokens.slice(1)];
  }

  const cmd = tokens[0].toUpperCase();
  const args = tokens.slice(1);
  const unit = st().unit;
  const L = (v: number) => fromDisplay(v, unit);

  /** Parse numeric args; null (and a usage message) if count/format is wrong. */
  const nums = (min: number, max: number, usage: string): number[] | null => {
    const v = args.map(Number);
    if (args.length < min || args.length > max || !v.every(Number.isFinite)) {
      print(`Usage: ${usage}`);
      return null;
    }
    return v;
  };
  const positive = (vals: number[], usage: string) => {
    if (vals.some((v) => v <= 0)) {
      print(`Error: sizes must be greater than 0. Usage: ${usage}`);
      return false;
    }
    return true;
  };
  const pos = (v: number[], at: number): Vec3 | undefined =>
    v.length >= at + 3 ? [L(v[at]), L(v[at + 1]), L(v[at + 2])] : undefined;
  const selected = () => {
    const s = st();
    const o = findObject(s.objects, s.selectedId);
    if (!o) print('Error: select an object first.');
    return o;
  };

  switch (cmd) {
    case 'HELP':
    case '?':
      HELP.forEach(print);
      return;

    case 'BOX': {
      const u = 'BOX w d h [x y z]';
      const v = nums(3, 6, u);
      if (!v || !positive(v.slice(0, 3), u)) return;
      st().addObject({ type: 'box', params: { width: L(v[0]), depth: L(v[1]), height: L(v[2]) }, position: pos(v, 3) });
      return print(`Box ${v[0]} x ${v[1]} x ${v[2]} ${unit}`);
    }
    case 'CYL':
    case 'CYLINDER': {
      const u = 'CYL r h [x y z]';
      const v = nums(2, 5, u);
      if (!v || !positive(v.slice(0, 2), u)) return;
      st().addObject({ type: 'cylinder', params: { radius: L(v[0]), height: L(v[1]) }, position: pos(v, 2) });
      return print(`Cylinder r=${v[0]} h=${v[1]} ${unit}`);
    }
    case 'SPHERE': {
      const u = 'SPHERE r [x y z]';
      const v = nums(1, 4, u);
      if (!v || !positive(v.slice(0, 1), u)) return;
      st().addObject({ type: 'sphere', params: { radius: L(v[0]) }, position: pos(v, 1) });
      return print(`Sphere r=${v[0]} ${unit}`);
    }
    case 'CONE': {
      const u = 'CONE r h [x y z]';
      const v = nums(2, 5, u);
      if (!v || !positive(v.slice(0, 2), u)) return;
      st().addObject({ type: 'cone', params: { radius: L(v[0]), height: L(v[1]) }, position: pos(v, 2) });
      return print(`Cone r=${v[0]} h=${v[1]} ${unit}`);
    }

    case 'WALL': {
      const u = 'WALL x1 y1 x2 y2 [thickness] [height]';
      const v = nums(4, 6, u);
      if (!v) return;
      const t = v[4] !== undefined ? L(v[4]) : WALL_THICKNESS;
      const h = v[5] !== undefined ? L(v[5]) : WALL_HEIGHT;
      if (!positive([t, h], u)) return;
      const pts = wallPoints([L(v[0]), L(v[1])], [L(v[2]), L(v[3])], t);
      if (!pts) return print('Error: wall start and end are the same point.');
      const r = profileFromPoints(pts);
      if ('error' in r) return print(`Error: ${r.error}`);
      const n = st().objects.filter((o) => o.name.startsWith('Wall')).length + 1;
      st().addObject({
        type: 'extrusion',
        name: `Wall ${n}`,
        params: { height: h },
        profile: r.profile,
        position: [r.center[0], r.center[1], 0],
      });
      return print(`Wall ${fmt(Math.hypot(L(v[2] - v[0]), L(v[3] - v[1])), unit)} long, ${fmt(t, unit)} thick, ${fmt(h, unit)} high`);
    }

    case 'POLY': {
      const u = 'POLY h x1 y1 x2 y2 x3 y3 ...';
      const v = nums(7, 20001, u);
      if (!v) return;
      if (v[0] <= 0 || (v.length - 1) % 2 !== 0) return print(`Usage: ${u}`);
      const pts: Pt[] = [];
      for (let i = 1; i < v.length; i += 2) pts.push([L(v[i]), L(v[i + 1])]);
      const r = profileFromPoints(pts);
      if ('error' in r) return print(`Error: ${r.error}`);
      st().addObject({ type: 'extrusion', params: { height: L(v[0]) }, profile: r.profile, position: [r.center[0], r.center[1], 0] });
      return print(`Extruded ${r.profile.length}-point polygon`);
    }

    case 'SKETCH':
      st().setTool('sketch');
      return print('Sketch: click points or type "x y" / "@dx dy". Enter closes, Esc cancels, Shift locks to 90°.');
    case 'P':
    case '@': {
      if (st().tool !== 'sketch') return print('Error: start SKETCH first.');
      const v = nums(2, 2, cmd === 'P' ? 'x y' : '@dx dy');
      if (!v) return;
      const last = st().sketchPoints.at(-1);
      if (cmd === '@' && !last) return print('Error: no previous point for a relative coordinate.');
      const p: Pt = cmd === '@' ? [last![0] + L(v[0]), last![1] + L(v[1])] : [L(v[0]), L(v[1])];
      st().addSketchPoint(p);
      return;
    }
    case 'CLOSE':
      if (st().tool !== 'sketch') return print('Error: not sketching.');
      st().finishSketch();
      return;
    case 'CANCEL':
      st().setTool('select');
      return print('Sketch cancelled.');
    case 'HEIGHT': {
      const v = nums(1, 1, 'HEIGHT h');
      if (!v || !positive(v, 'HEIGHT h')) return;
      st().setExtrudeHeight(L(v[0]));
      return print(`Sketch extrude height: ${v[0]} ${unit}`);
    }

    case 'MOVE': {
      const v = nums(2, 3, 'MOVE dx dy [dz]');
      const o = v && selected();
      if (!v || !o) return;
      const d: Vec3 = [L(v[0]), L(v[1]), L(v[2] ?? 0)];
      st().updateObject(o.id, { position: [o.position[0] + d[0], o.position[1] + d[1], o.position[2] + d[2]] });
      return;
    }
    case 'MOVETO': {
      const v = nums(2, 3, 'MOVETO x y [z]');
      const o = v && selected();
      if (!v || !o) return;
      st().updateObject(o.id, { position: [L(v[0]), L(v[1]), v[2] !== undefined ? L(v[2]) : o.position[2]] });
      return;
    }
    case 'ROTATE': {
      const axis = (args[1] ?? 'Z').toUpperCase();
      const deg = Number(args[0]);
      if (args.length < 1 || args.length > 2 || !Number.isFinite(deg) || !['X', 'Y', 'Z'].includes(axis))
        return print('Usage: ROTATE deg [X|Y|Z]');
      const o = selected();
      if (!o) return;
      const r = [...o.rotation] as Vec3;
      r['XYZ'.indexOf(axis)] += deg * DEG2RAD;
      st().updateObject(o.id, { rotation: r });
      return;
    }
    case 'COPY': {
      const v = args.length ? nums(2, 3, 'COPY [dx dy dz]') : [];
      const o = v && selected();
      if (!v || !o) return;
      const off: Vec3 = v.length ? [L(v[0]), L(v[1]), L(v[2] ?? 0)] : [100, 0, 0];
      st().duplicateObject(o.id, off);
      return;
    }
    case 'DEL':
    case 'DELETE':
      if (!st().selection.length) return print('Error: select an object first.');
      st().removeSelected();
      return;
    case 'SELECT': {
      // Names may contain spaces, so split the raw text on commas only
      const names = line.slice(tokens[0].length).split(',').map((n) => n.trim().toLowerCase()).filter(Boolean);
      if (!names.length) return print('Usage: SELECT name[, name2, ...]');
      const all = flatten(st().objects);
      const ids: string[] = [];
      for (const n of names) {
        const o = all.find((x) => x.name.toLowerCase() === n);
        if (!o) return print(`Error: no object named "${n}".`);
        ids.push(o.id);
      }
      st().setTool('select');
      st().setSelection(ids);
      return print(`Selected ${ids.length}.`);
    }
    case 'LIST': {
      if (!st().objects.length) return print('No objects.');
      const walk = (list: CadObject[], indent: string): void =>
        list.forEach((o) => {
          print(`${indent}${o.name} (${o.op ?? o.type}) at ${o.position.map((p) => toDisplay(p, unit)).join(', ')} ${unit}`);
          if (o.children) walk(o.children, indent + '  ');
        });
      walk(st().objects, '');
      return;
    }

    case 'UNION':
    case 'SUBTRACT':
    case 'SUB':
    case 'INTERSECT':
    case 'INT': {
      const op = cmd.startsWith('U') ? 'union' : cmd.startsWith('S') ? 'subtract' : 'intersect';
      st().booleanOp(op);
      return;
    }
    case 'EXPLODE': {
      const o = selected();
      if (o) st().explode(o.id);
      return;
    }

    case 'UNDO':
      return st().undo();
    case 'REDO':
      return st().redo();
    case 'UNITS':
    case 'UNIT': {
      const u = args[0]?.toLowerCase();
      if (u !== 'mm' && u !== 'cm' && u !== 'm') return print('Usage: UNITS mm|cm|m');
      st().setUnit(u);
      return print(`Units: ${u}`);
    }
    case 'SNAP': {
      const a = args[0]?.toLowerCase();
      if (a === 'on' || a === 'off') {
        st().setSnap({ enabled: a === 'on' });
        return print(`Snap ${a}`);
      }
      const step = Number(a);
      if (!a || !Number.isFinite(step) || step <= 0) return print('Usage: SNAP on|off|step');
      st().setSnap({ enabled: true, step: L(step) });
      return print(`Snap step: ${step} ${unit}`);
    }

    case 'NEW':
      return newProject();
    case 'OPEN':
      return openProject();
    case 'SAVE':
      return saveProject();
    case 'EXPORT': {
      const k = args[0]?.toLowerCase();
      if (k !== 'stl' && k !== 'obj') return print('Usage: EXPORT stl|obj');
      return exportModel(k);
    }

    default:
      print(`Unknown command "${tokens[0]}". Type HELP.`);
  }
}
