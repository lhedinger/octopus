import { useMemo } from 'react';
import { useArchStore } from '../store/useArchStore';

/**
 * Environment view switcher. Environments aren't a drill level — they're the
 * same map re-stamped: pick one and every tile shows its deployed version
 * (coloured by status), while components not deployed there dim out.
 * Only rendered when the current level carries environment data.
 */
export function EnvBar() {
  const nodes = useArchStore((s) => s.nodes);
  const env = useArchStore((s) => s.env);
  const setEnv = useArchStore((s) => s.setEnv);

  const envNames = useMemo(() => {
    const names = new Set<string>();
    for (const n of nodes) {
      const envs = n.data.meta?.environments as Record<string, unknown> | undefined;
      if (envs) for (const name of Object.keys(envs)) names.add(name);
    }
    return [...names].sort();
  }, [nodes]);

  if (envNames.length === 0) return null;

  const pill = (active: boolean) =>
    `rounded-full px-2.5 py-1 text-xs font-medium transition ${
      active ? 'bg-accent text-panel' : 'text-slate-300 hover:bg-white/10'
    }`;

  return (
    <div
      data-overlay
      className="absolute left-1/2 top-14 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-panel/80 p-0.5 shadow-lg backdrop-blur sm:top-3 sm:left-auto sm:right-44 sm:translate-x-0"
    >
      <button className={pill(env === 'none')} onClick={() => setEnv('none')}>
        Design
      </button>
      {envNames.map((name) => (
        <button key={name} className={pill(env === name)} onClick={() => setEnv(env === name ? 'none' : name)}>
          {name}
        </button>
      ))}
    </div>
  );
}
