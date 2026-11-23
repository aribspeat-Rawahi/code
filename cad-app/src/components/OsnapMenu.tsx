import { useEffect, useRef, useState } from 'react';
import { useScene } from '../store/sceneStore';
import { SNAP_COLOR, SNAP_LABEL, type SnapKind } from '../tools/snap';

const ORDER: SnapKind[] = ['end', 'mid', 'center', 'int', 'near'];

/** Status-bar object snap switch, with a pop-up to turn individual snap modes on and off. */
export default function OsnapMenu() {
  const snap = useScene((s) => s.snap);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  const on = ORDER.filter((k) => snap.modes[k]).length;
  return (
    <div className="osnap" ref={ref}>
      <button
        className={`status-btn ${snap.object ? 'active' : ''}`}
        onClick={() => useScene.getState().setSnap({ object: !snap.object })}
        title="Object snap on/off (F3)"
      >
        OSnap {snap.object ? `on (${on}/5)` : 'off'}
      </button>
      <button className="status-btn" onClick={() => setOpen(!open)} title="Choose snap modes" aria-expanded={open}>
        ▾
      </button>
      {open && (
        <div className="osnap-pop" role="menu">
          {ORDER.map((k) => (
            <label key={k}>
              <input
                type="checkbox"
                checked={snap.modes[k]}
                onChange={(e) => useScene.getState().setSnap({ modes: { ...snap.modes, [k]: e.target.checked } })}
              />
              <span className="dot" style={{ background: SNAP_COLOR[k] }} />
              {SNAP_LABEL[k]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
