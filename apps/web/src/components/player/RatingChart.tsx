/**
 * Server-rendered SVG line chart for rating history.
 * No client JS, no dependencies — pure SVG generated at build/request time.
 */

interface Point {
  id: string;
  result: string;
  rating_after: number;
  rating_change: number;
  played_at: string;
}

interface Props {
  history: Point[];
}

const W = 560;   // viewBox width
const H = 180;   // viewBox height
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

export function RatingChart({ history }: Props) {
  if (history.length < 2) {
    return (
      <p className="text-xs text-slate-500 text-center py-8">
        Play more matches to see your rating chart.
      </p>
    );
  }

  const ratings = history.map((h) => h.rating_after);
  const minRating = Math.floor(Math.min(...ratings) * 4) / 4 - 0.25;
  const maxRating = Math.ceil(Math.max(...ratings) * 4) / 4 + 0.25;
  const ratingRange = maxRating - minRating || 1;

  // Map data → SVG coords
  const toX = (i: number) => PAD.left + (i / (history.length - 1)) * CHART_W;
  const toY = (r: number) => PAD.top + (1 - (r - minRating) / ratingRange) * CHART_H;

  // Build polyline points string
  const points = history.map((h, i) => `${toX(i)},${toY(h.rating_after)}`).join(' ');

  // Area fill path (close below the line)
  const areaPath = [
    `M ${toX(0)},${toY(history[0].rating_after)}`,
    ...history.map((h, i) => `L ${toX(i)},${toY(h.rating_after)}`),
    `L ${toX(history.length - 1)},${PAD.top + CHART_H}`,
    `L ${PAD.left},${PAD.top + CHART_H}`,
    'Z',
  ].join(' ');

  // Y-axis tick marks (~4 ticks)
  const tickCount = 4;
  const tickStep = ratingRange / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => minRating + i * tickStep);

  // Determine colour by trend (last 5 matches)
  const last5 = history.slice(-5);
  const trend = last5.reduce((sum, h) => sum + h.rating_change, 0);
  const lineColour = trend >= 0 ? '#34d399' : '#f87171'; // accent-400 / red-400
  const areaColour = trend >= 0 ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)';

  // Most recent point (highlighted)
  const lastIdx = history.length - 1;
  const lastPoint = history[lastIdx];
  const lastX = toX(lastIdx);
  const lastY = toY(lastPoint.rating_after);

  // X-axis date labels (show first, middle, last)
  const labelIndices = [0, Math.floor(lastIdx / 2), lastIdx];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      aria-label="Rating history chart"
      role="img"
    >
      <defs>
        <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColour} stopOpacity="0.15" />
          <stop offset="100%" stopColor={lineColour} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {ticks.map((tick) => {
        const y = toY(tick);
        return (
          <g key={tick}>
            <line
              x1={PAD.left} y1={y}
              x2={PAD.left + CHART_W} y2={y}
              stroke="#1e293b" strokeWidth="1"
            />
            <text
              x={PAD.left - 6} y={y}
              textAnchor="end" dominantBaseline="middle"
              fontSize="9" fill="#475569"
            >
              {tick.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill="url(#ratingGrad)" />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={lineColour}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Win/loss dots — only if ≤ 40 matches (otherwise too crowded) */}
      {history.length <= 40 && history.map((h, i) => {
        const isWin = h.result === 'win' || h.result === 'walkover_win';
        return (
          <circle
            key={h.id}
            cx={toX(i)} cy={toY(h.rating_after)}
            r="3"
            fill={isWin ? '#34d399' : '#f87171'}
            stroke="#0f172a"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Highlighted last point */}
      <circle cx={lastX} cy={lastY} r="5" fill={lineColour} stroke="#0f172a" strokeWidth="2" />
      <text
        x={lastX} y={lastY - 10}
        textAnchor={lastIdx > history.length * 0.7 ? 'end' : 'middle'}
        fontSize="10" fill={lineColour} fontWeight="bold"
      >
        {lastPoint.rating_after.toFixed(2)}
      </text>

      {/* X-axis date labels */}
      {labelIndices.map((idx) => {
        const h = history[idx];
        const x = toX(idx);
        const anchor = idx === 0 ? 'start' : idx === lastIdx ? 'end' : 'middle';
        const label = new Date(h.played_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
        return (
          <text
            key={idx}
            x={x} y={H - 4}
            textAnchor={anchor} fontSize="9" fill="#475569"
          >
            {label}
          </text>
        );
      })}

      {/* Bottom axis line */}
      <line
        x1={PAD.left} y1={PAD.top + CHART_H}
        x2={PAD.left + CHART_W} y2={PAD.top + CHART_H}
        stroke="#1e293b" strokeWidth="1"
      />
    </svg>
  );
}
