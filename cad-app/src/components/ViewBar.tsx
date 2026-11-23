import { useScene, type ViewName } from '../store/sceneStore';

const VIEWS: { name: ViewName; label: string; key: string }[] = [
  { name: 'top', label: 'Top', key: '1' },
  { name: 'front', label: 'Front', key: '2' },
  { name: 'right', label: 'Right', key: '3' },
  { name: 'left', label: 'Left', key: '4' },
  { name: 'back', label: 'Back', key: '5' },
  { name: 'iso', label: 'Iso', key: '0' },
];

/** Standard views, projection toggle and zoom extents, floating over the viewport. */
export default function ViewBar() {
  const view = useScene((s) => s.view);
  const { setView, setProjection, zoomExtents } = useScene.getState();
  return (
    <div className="viewbar" role="toolbar" aria-label="View">
      {VIEWS.map((v) => (
        <button
          key={v.name}
          className={view.name === v.name ? 'active' : ''}
          onClick={() => setView(v.name)}
          title={`${v.label} view (${v.key})`}
        >
          {v.label}
        </button>
      ))}
      <span className="sep" />
      <button
        onClick={() => setProjection(!view.ortho)}
        title="Toggle orthographic / perspective (P). Orthographic shows true lengths."
        className={view.ortho ? 'active' : ''}
      >
        {view.ortho ? 'Ortho' : 'Persp'}
      </button>
      <button onClick={zoomExtents} title="Zoom extents: fit everything (F)">
        Fit
      </button>
    </div>
  );
}
