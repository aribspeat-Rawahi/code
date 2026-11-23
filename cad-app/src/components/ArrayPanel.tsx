import { useEffect, useState } from 'react';
import { arrayPlacements, useScene, type ArrayParams } from '../store/sceneStore';
import { fromDisplay, toDisplay } from '../units';

/** Number input that updates the preview as you type; invalid values are ignored. */
function Num({
  label,
  value,
  onChange,
  int = false,
  min,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  int?: boolean;
  min?: number;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <span className="num-wrap">
        <input
          type="number"
          step={int ? 1 : 'any'}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(v) && (!int || Number.isInteger(v)) && (min === undefined || v >= min)) onChange(v);
          }}
          onBlur={() => setText(String(value))}
        />
        {suffix && <small>{suffix}</small>}
      </span>
    </label>
  );
}

export default function ArrayPanel() {
  const draft = useScene((s) => s.arrayDraft);
  const unit = useScene((s) => s.unit);
  const selection = useScene((s) => s.selection);
  const objects = useScene((s) => s.objects);
  const tool = useScene((s) => s.tool);
  if (!draft) return null;

  const { updateArray, applyArray, closeArray, startPickTool } = useScene.getState();
  const set = (patch: Partial<ArrayParams>) => updateArray(patch);
  const L = (mm: number) => Math.round(toDisplay(mm, unit) * 1000) / 1000;
  const M = (v: number) => fromDisplay(v, unit);
  const sources = objects.filter((o) => selection.includes(o.id) && o.type !== 'dimension');
  const copies = sources.reduce((n, o) => n + arrayPlacements(draft, o.position).length, 0);

  return (
    <div className="array-panel" role="dialog" aria-label="Array">
      <div className="array-head">
        <strong>Array</strong>
        <div className="seg">
          <button className={draft.kind === 'rect' ? 'active' : ''} onClick={() => set({ kind: 'rect' })}>
            Rectangular
          </button>
          <button className={draft.kind === 'polar' ? 'active' : ''} onClick={() => set({ kind: 'polar' })}>
            Polar
          </button>
        </div>
      </div>

      {draft.kind === 'rect' ? (
        <>
          <Num label="Columns" value={draft.cols} int min={1} onChange={(v) => set({ cols: v })} />
          <Num label="Spacing X" value={L(draft.dx)} suffix={unit} onChange={(v) => set({ dx: M(v) })} />
          <Num label="Rows" value={draft.rows} int min={1} onChange={(v) => set({ rows: v })} />
          <Num label="Spacing Y" value={L(draft.dy)} suffix={unit} onChange={(v) => set({ dy: M(v) })} />
          <Num label="Levels" value={draft.levels} int min={1} onChange={(v) => set({ levels: v })} />
          {draft.levels > 1 && <Num label="Spacing Z" value={L(draft.dz)} suffix={unit} onChange={(v) => set({ dz: M(v) })} />}
        </>
      ) : (
        <>
          <Num label="Count" value={draft.count} int min={2} onChange={(v) => set({ count: v })} />
          <Num label="Angle" value={draft.angle} suffix="°" onChange={(v) => set({ angle: v })} />
          <Num label="Centre X" value={L(draft.center[0])} suffix={unit} onChange={(v) => set({ center: [M(v), draft.center[1]] })} />
          <Num label="Centre Y" value={L(draft.center[1])} suffix={unit} onChange={(v) => set({ center: [draft.center[0], M(v)] })} />
          <button className={`pick ${tool === 'arraycenter' ? 'active' : ''}`} onClick={() => startPickTool('arraycenter')}>
            ⌖ Pick centre in view
          </button>
          <label className="check">
            <input type="checkbox" checked={draft.rotate} onChange={(e) => set({ rotate: e.target.checked })} />
            Rotate copies around the centre
          </label>
        </>
      )}

      <p className="empty">
        {copies} new {copies === 1 ? 'copy' : 'copies'} of {sources.length} object{sources.length === 1 ? '' : 's'}
        {copies >= 2000 ? ' (limit reached)' : ''}
      </p>
      <div className="array-actions">
        <button onClick={closeArray}>Cancel</button>
        <button className="active" onClick={applyArray} disabled={!copies}>
          Apply
        </button>
      </div>
    </div>
  );
}
