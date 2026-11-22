import type { MouseEvent } from 'react';
import { useScene, type CadObject } from '../store/sceneStore';
import { BOOLEAN_LABEL } from '../tools/primitives';

const OP_ICON = { union: '∪', subtract: '−', intersect: '∩' } as const;

function Row({ o, depth, role }: { o: CadObject; depth: number; role?: string }) {
  const selected = useScene((s) => s.selection.includes(o.id));
  const { select, updateObject } = useScene.getState();

  return (
    <>
      <li
        className={selected ? 'selected' : ''}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={(e: MouseEvent) => select(o.id, e.ctrlKey || e.shiftKey || e.metaKey)}
        title={o.op ? `${BOOLEAN_LABEL[o.op]} (first part is the base)` : undefined}
      >
        {o.op ? (
          <span className="op">{OP_ICON[o.op]}</span>
        ) : o.type === 'dimension' ? (
          <span className="op" style={{ color: o.color }}>↔</span>
        ) : (
          <span className="swatch" style={{ background: o.color }} />
        )}
        <span className={`name ${o.visible ? '' : 'hidden'}`}>{o.name}</span>
        {role && <span className="role">{role}</span>}
        <button
          className="eye"
          title={o.visible ? (depth ? 'Suppress this part' : 'Hide') : 'Show'}
          onClick={(e) => {
            e.stopPropagation();
            updateObject(o.id, { visible: !o.visible });
          }}
        >
          {o.visible ? '👁' : '–'}
        </button>
      </li>
      {o.children?.map((c, i) => (
        <Row key={c.id} o={c} depth={depth + 1} role={i === 0 ? 'base' : o.op === 'subtract' ? 'cut' : 'tool'} />
      ))}
    </>
  );
}

export default function ObjectTree() {
  const objects = useScene((s) => s.objects);
  return (
    <aside className="panel left">
      <h2>Objects</h2>
      {objects.length === 0 && <p className="empty">Nothing yet. Add a shape from the toolbar.</p>}
      <ul className="tree">
        {objects.map((o) => (
          <Row key={o.id} o={o} depth={0} />
        ))}
      </ul>
      {objects.length > 1 && <p className="empty tip">Ctrl+click to select several. The first one is the base for booleans.</p>}
    </aside>
  );
}
