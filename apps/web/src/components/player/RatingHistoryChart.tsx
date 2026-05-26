'use client';

type DataPoint = { played_at: string; rating_after: number };

interface Props {
  data: DataPoint[];
  currentRating: number;
  peakRating: number;
}

export function RatingHistoryChart({ data, currentRating, peakRating }: Props) {
  if (data.length < 2) return null;

  const W = 400;
  const H = 80;
  const PAD = { top: 8, right: 8, bottom: 4, left: 8 };

  const ratings = data.map((d) => d.rating_after);
  const minR = Math.min(...ratings);
  const maxR = Math.max(Math.max(...ratings), peakRating);
  const range = maxR - minR || 1;

  // Map data to SVG coordinates
  function xOf(i: number): number {
    return PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right);
  }
  function yOf(rating: number): number {
    return PAD.top + (1 - (rating - minR) / range) * (H - PAD.top - PAD.bottom);
  }

  const points = data.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.rating_after).toFixed(1)}`).join(' ');
  const lastX = xOf(data.length - 1);
  const lastY = yOf(data[data.length - 1].rating_after);
  const peakY = yOf(peakRating);
  const showPeakLine = peakRating > currentRating + 0.1;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

  return (
    <div className="rounded-xl bg-surface ring-1 ring-surface-border px-5 py-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Rating history
      </p>

      {/* Responsive SVG sparkline */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: H }}
          aria-hidden="true"
        >
          {/* Peak rating dashed line */}
          {showPeakLine && (
            <line
              x1={PAD.left}
              y1={peakY}
              x2={W - PAD.right}
              y2={peakY}
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.6"
            />
          )}

          {/* Rating line */}
          <polyline
            points={points}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Area fill */}
          <polygon
            points={`${PAD.left},${H - PAD.bottom} ${points} ${W - PAD.right},${H - PAD.bottom}`}
            fill="url(#ratingGradient)"
            opacity="0.15"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Current rating dot */}
          <circle cx={lastX} cy={lastY} r="3.5" fill="#6366f1" />
          <circle cx={lastX} cy={lastY} r="6" fill="#6366f1" opacity="0.2" />
        </svg>
      </div>

      {/* Axis labels */}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-slate-700">{formatDate(data[0].played_at)}</span>
        <span className="text-[10px] text-slate-700">{formatDate(data[data.length - 1].played_at)}</span>
      </div>

      {/* Stats row */}
      <div className="mt-2 flex items-center gap-4 text-xs">
        <span className="text-slate-400">
          Current: <span className="font-semibold text-brand-300">{currentRating.toFixed(0)}</span>
        </span>
        {showPeakLine && (
          <span className="text-slate-400">
            Peak: <span className="font-semibold text-amber-400">{peakRating.toFixed(0)}</span>
          </span>
        )}
        <span className="text-slate-400">
          {data.length} rated match{data.length !== 1 ? 'es' : ''}
        </span>
      </div>
    </div>
  );
}
