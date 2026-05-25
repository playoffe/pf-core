import { BADGE_MAP } from '@/lib/badges';

interface Props {
  slugs: string[];
}

export function BadgeList({ slugs }: Props) {
  if (slugs.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Achievements
      </p>
      <div className="flex flex-wrap gap-2">
        {slugs.map((slug) => {
          const def = BADGE_MAP.get(slug);
          if (!def) return null;
          return (
            <div
              key={slug}
              title={def.description}
              className="group relative flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3 py-1 text-xs font-medium text-slate-300 hover:border-brand-500/50 transition-colors cursor-default"
            >
              <span className="text-sm leading-none">{def.icon}</span>
              <span className={def.color}>{def.label}</span>

              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-300 ring-1 ring-surface-border shadow-lg group-hover:block">
                {def.description}
                <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-slate-900 ring-1 ring-surface-border" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
