import { useEffect, useRef, useState } from 'react';
import { useScene } from '../store/sceneStore';
import { runCommand } from '../tools/commands';

export default function CommandLine() {
  const log = useScene((s) => s.log);
  const tool = useScene((s) => s.tool);
  const picked = useScene((s) => s.pickPoints.length);
  const sketching = tool === 'sketch';
  const [text, setText] = useState('');
  const history = useRef<string[]>([]);
  const histIdx = useRef(-1);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const submit = () => {
    const line = text;
    if (line.trim()) history.current = [line, ...history.current.filter((h) => h !== line)].slice(0, 50);
    histIdx.current = -1;
    setText('');
    void runCommand(line);
  };

  const recall = (dir: 1 | -1) => {
    const next = Math.min(Math.max(histIdx.current + dir, -1), history.current.length - 1);
    histIdx.current = next;
    setText(next === -1 ? '' : history.current[next]);
  };

  return (
    <div className="cmd">
      <div className="cmd-log" ref={logRef}>
        {log.map((l, i) => (
          <div key={i} className={l.startsWith('>') ? 'echo' : l.startsWith('Error') ? 'err' : ''}>
            {l}
          </div>
        ))}
      </div>
      <label className="cmd-input">
        <span>
          {sketching
            ? 'Point (x y / @dx dy):'
            : tool === 'pickmove'
              ? picked ? 'Target (x y z / @dx dy dz):' : 'Base point (x y z):'
              : tool === 'measure' || tool === 'dimension'
                ? `Point ${picked + 1} (x y z / @dx dy dz):`
                : 'Command:'}
        </span>
        <input
          id="command-input"
          value={text}
          spellCheck={false}
          autoComplete="off"
          placeholder={sketching ? 'Enter to close profile' : tool !== 'select' ? 'or click in the view · Esc cancels' : 'Type HELP'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            else if (e.key === 'ArrowUp') { e.preventDefault(); recall(1); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); recall(-1); }
            else if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
          }}
        />
      </label>
    </div>
  );
}
