import { useArchStore } from '../store/useArchStore';

/**
 * Drill-down path. Hidden at the root; once you've entered a component it shows
 * Project › Component › … with each crumb tappable to climb back to that level.
 */
export function Breadcrumb() {
  const path = useArchStore((s) => s.path);
  const docName = useArchStore((s) => s.docName);
  const levels = useArchStore((s) => s.levels);
  const exitTo = useArchStore((s) => s.exitTo);

  if (path.length === 0) return null;

  const crumbs = [{ label: docName || 'Project', depth: 0 }];
  for (let i = 0; i < path.length; i++) {
    const parentKey = path.slice(0, i).join('/');
    const node = levels[parentKey]?.nodes.find((n) => n.id === path[i]);
    crumbs.push({ label: node?.label || 'Untitled', depth: i + 1 });
  }

  return (
    <div className="absolute left-3 top-14 z-20 flex max-w-[calc(100vw-1.5rem)] items-center gap-0.5 overflow-x-auto rounded-full border border-white/10 bg-panel/80 px-2 py-1 text-sm shadow-lg backdrop-blur sm:top-16">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex shrink-0 items-center gap-0.5">
            {i > 0 && <span className="text-slate-500">›</span>}
            <button
              onClick={() => !isLast && exitTo(c.depth)}
              disabled={isLast}
              className={`whitespace-nowrap rounded px-1.5 py-0.5 ${
                isLast ? 'font-semibold text-slate-100' : 'text-slate-400 transition hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}
