// src/app/admin/treasury/components/TreasuryMiniCharts.tsx
'use client';

// Pure-SVG micro charts — no external deps

export function DonutChart({
  segments,
  size = 140,
  thickness = 18,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map(seg => {
          const fraction = seg.value / total;
          const dashLength = circumference * fraction;
          const dashOffset = -offset;
          offset += dashLength;
          return (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${dashLength} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
            />
          );
        })}
      </g>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius - thickness / 2 - 2}
        fill="rgba(0,0,0,0.4)"
      />
    </svg>
  );
}

export function Sparkline({
  values,
  width = 260,
  height = 60,
  color = '#fbbf24',
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-xs text-white/20">
        Not enough data
      </div>
    );
  }

  const max = Math.max(...values, 0.0001);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });

  const areaPoints = `0,${height} ${points.join(' ')} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkFill)" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BarChart({
  data,
  height = 140,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 0.0001);

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t bg-gradient-to-t from-emerald-500/70 to-amber-400/80 transition-all duration-300 group-hover:from-emerald-400 group-hover:to-amber-300"
                style={{ height: `${Math.max(pct, 2)}%`, minHeight: 3 }}
                title={`${d.label}: ${d.value.toFixed(2)}`}
              />
            </div>
            <span className="text-[9px] text-white/30 truncate w-full text-center">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}