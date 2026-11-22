import { useScene } from '../store/sceneStore';

export default function ObjectTree() {
  const objects = useScene((s) => s.objects);
  const selectedId = useScene((s) => s.selectedId);
  const { select, updateObject } = useScene.getState();

  return (
    <aside className="panel left">
      <h2>Objects</h2>
      {objects.length === 0 && <p className="empty">Nothing yet. Add a shape from the toolbar.</p>}
      <ul className="tree">
        {objects.map((o) => (
          <li
            key={o.id}
            className={o.id === selectedId ? 'selected' : ''}
            onClick={() => select(o.id)}
          >
            <span className="swatch" style={{ background: o.color }} />
            <span className={`name ${o.visible ? '' : 'hidden'}`}>{o.name}</span>
            <button
              className="eye"
              title={o.visible ? 'Hide' : 'Show'}
              onClick={(e) => {
                e.stopPropagation();
                updateObject(o.id, { visible: !o.visible });
              }}
            >
              {o.visible ? '👁' : '–'}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
