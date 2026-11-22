import { useEffect, useState } from 'react';
import { useScene, type Vec3 } from '../store/sceneStore';
import { findObject, findParent } from '../store/tree';
import { BOOLEAN_LABEL } from '../tools/primitives';
import { DEG2RAD, RAD2DEG, fromDisplay, toDisplay } from '../units';

/** Numeric input that commits on Enter or blur, so typing doesn't spam undo history. */
function NumField({
  label,
  value,
  onCommit,
  min,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const v = Number(text);
    if (!Number.isFinite(v) || (min !== undefined && v < min)) {
      setText(String(value)); // reject invalid input
      return;
    }
    if (v !== value) onCommit(v);
  };

  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        step="any"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setText(String(value));
        }}
      />
    </label>
  );
}

const AXES = ['X', 'Y', 'Z'] as const;

export default function PropertiesPanel() {
  const obj = useScene((s) => findObject(s.objects, s.selectedId));
  const parent = useScene((s) => (s.selectedId ? findParent(s.objects, s.selectedId) : undefined));
  const extra = useScene((s) => s.selection.length - 1);
  const select = useScene((s) => s.select);
  const unit = useScene((s) => s.unit);
  const updateObject = useScene((s) => s.updateObject);

  if (!obj) {
    return (
      <aside className="panel right">
        <h2>Properties</h2>
        <p className="empty">Select an object to edit its dimensions.</p>
      </aside>
    );
  }

  const setVec = (key: 'position' | 'rotation' | 'scale', i: number, v: number) => {
    const next = [...obj[key]] as Vec3;
    next[i] = v;
    updateObject(obj.id, { [key]: next });
  };

  return (
    <aside className="panel right">
      <h2>Properties</h2>

      <label className="field wide">
        <span>Name</span>
        <input
          key={obj.id}
          defaultValue={obj.name}
          maxLength={80}
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (name && name !== obj.name) updateObject(obj.id, { name });
          }}
        />
      </label>

      {extra > 0 && <p className="note">+{extra} more selected. Boolean uses this one as the base.</p>}
      {parent && (
        <p className="note">
          Part of <a onClick={() => select(parent.id)}>{parent.name}</a>. Position is relative to it.
        </p>
      )}

      {obj.op && obj.children && (
        <>
          <h3>{BOOLEAN_LABEL[obj.op]}</h3>
          <ul className="parts">
            {obj.children.map((c, i) => (
              <li key={c.id}>
                <a onClick={() => select(c.id)}>{c.name}</a>
                <span className="role">{i === 0 ? 'base' : obj.op === 'subtract' ? 'cut' : 'tool'}</span>
              </li>
            ))}
          </ul>
          <p className="empty">Click a part to edit its size; the result updates live. EXPLODE to split it again.</p>
        </>
      )}

      {Object.keys(obj.params).length > 0 && <h3>Dimensions ({unit})</h3>}
      {Object.entries(obj.params).map(([k, v]) => (
        <NumField
          key={k}
          label={k}
          value={toDisplay(v, unit)}
          min={0.001}
          onCommit={(d) => updateObject(obj.id, { params: { ...obj.params, [k]: fromDisplay(d, unit) } })}
        />
      ))}

      {obj.profile && <p className="empty">Profile: {obj.profile.length} points</p>}

      <h3>Position ({unit})</h3>
      {AXES.map((a, i) => (
        <NumField
          key={a}
          label={a}
          value={toDisplay(obj.position[i], unit)}
          onCommit={(d) => setVec('position', i, fromDisplay(d, unit))}
        />
      ))}

      <h3>Rotation (°)</h3>
      {AXES.map((a, i) => (
        <NumField
          key={a}
          label={a}
          value={Math.round(obj.rotation[i] * RAD2DEG * 1000) / 1000}
          onCommit={(d) => setVec('rotation', i, d * DEG2RAD)}
        />
      ))}

      <h3>Scale</h3>
      {AXES.map((a, i) => (
        <NumField
          key={a}
          label={a}
          value={Math.round(obj.scale[i] * 1e4) / 1e4}
          min={0.0001}
          onCommit={(d) => setVec('scale', i, d)}
        />
      ))}

      <label className="field wide">
        <span>Color</span>
        <input
          type="color"
          value={obj.color}
          onChange={(e) => updateObject(obj.id, { color: e.target.value })}
        />
      </label>
    </aside>
  );
}
