import { useState } from 'react';
import { useScene, type Layer } from '../store/sceneStore';

function LayerRow({ layer, count, current }: { layer: Layer; count: number; current: boolean }) {
  const [editing, setEditing] = useState(false);
  const { updateLayer, deleteLayer, setCurrentLayer } = useScene.getState();

  const commit = (value: string) => {
    setEditing(false);
    const name = value.replace(/[\r\n\t]/g, ' ').trim().slice(0, 64);
    const taken = useScene.getState().layers.some((l) => l.id !== layer.id && l.name.toLowerCase() === name.toLowerCase());
    if (name && !taken && name !== layer.name) updateLayer(layer.id, { name });
  };

  return (
    <li className={`layer ${current ? 'current' : ''} ${layer.visible ? '' : 'off'}`}>
      <button
        className="layer-current"
        title={current ? 'Current layer: new objects go here' : 'Make current'}
        onClick={() => setCurrentLayer(layer.id)}
      >
        {current ? '●' : '○'}
      </button>
      <input
        type="color"
        className="layer-color"
        value={layer.color}
        title="Layer colour (used for DXF export)"
        onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
      />
      {editing && layer.id !== '0' ? (
        <input
          className="layer-name-input"
          autoFocus
          defaultValue={layer.name}
          maxLength={64}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <span
          className="layer-name"
          title={layer.id === '0' ? "Default layer (can't be renamed)" : 'Double-click to rename · click to make current'}
          onClick={() => setCurrentLayer(layer.id)}
          onDoubleClick={() => setEditing(true)}
        >
          {layer.name}
        </span>
      )}
      <span className="layer-count">{count}</span>
      <button className="eye" title={layer.visible ? 'Hide layer' : 'Show layer'} onClick={() => updateLayer(layer.id, { visible: !layer.visible })}>
        {layer.visible ? '👁' : '–'}
      </button>
      <button className="eye" title={layer.locked ? 'Unlock layer' : 'Lock layer (visible, snappable, not editable)'} onClick={() => updateLayer(layer.id, { locked: !layer.locked })}>
        {layer.locked ? '🔒' : '🔓'}
      </button>
      <button
        className="eye"
        title={layer.id === '0' ? "Layer 0 can't be deleted" : 'Delete layer (its objects move to layer 0)'}
        disabled={layer.id === '0'}
        onClick={() => deleteLayer(layer.id)}
      >
        ×
      </button>
    </li>
  );
}

export default function LayerPanel() {
  const layers = useScene((s) => s.layers);
  const objects = useScene((s) => s.objects);
  const current = useScene((s) => s.currentLayer);

  const counts = new Map<string, number>();
  for (const o of objects) counts.set(o.layer ?? '0', (counts.get(o.layer ?? '0') ?? 0) + 1);

  return (
    <section className="layers">
      <div className="layers-head">
        <h2>Layers</h2>
        <button
          title="New layer (becomes current)"
          onClick={() => {
            const s = useScene.getState();
            let n = s.layers.length;
            while (s.layers.some((l) => l.name === `Layer ${n}`)) n++;
            s.addLayer(`Layer ${n}`);
          }}
        >
          + Layer
        </button>
      </div>
      <ul className="layer-list">
        {layers.map((l) => (
          <LayerRow key={l.id} layer={l} count={counts.get(l.id) ?? 0} current={l.id === current} />
        ))}
      </ul>
    </section>
  );
}
