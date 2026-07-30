"use client";

import { useState } from "react";

export type YieldCurvePlotProps = {
  baseRate?: number | null;
  curveSlope?: number | null;
  className?: string;
};

type TenorPoint = {
  tenor: string;
  label: string;
  yieldValue: number;
};

export function YieldCurvePlot({
  baseRate = 4.35,
  curveSlope = -0.15,
  className = "",
}: YieldCurvePlotProps) {
  const [hoveredPoint, setHoveredPoint] = useState<TenorPoint | null>(null);

  const safeBase = typeof baseRate === "number" && !isNaN(baseRate) ? baseRate : 4.35;
  const safeSlope = typeof curveSlope === "number" && !isNaN(curveSlope) ? curveSlope : -0.15;

  // Synthesize realistic constant-maturity yield curve from base rate & slope
  // Slope = (10Y yield - 2Y yield).
  const y2Y = Math.max(0.5, safeBase - 0.2);
  const y10Y = Math.max(0.5, y2Y + safeSlope);
  const y30Y = Math.max(0.5, y10Y + 0.25);
  const y1M = safeBase;
  const y3M = safeBase - 0.05;
  const y6M = safeBase - 0.1;
  const y1Y = safeBase - 0.15;
  const y5Y = (y2Y + y10Y) / 2 + (safeSlope < 0 ? -0.05 : 0.05);

  const points: TenorPoint[] = [
    { tenor: "1M", label: "1-Month Yield", yieldValue: Number(y1M.toFixed(2)) },
    { tenor: "3M", label: "3-Month Yield", yieldValue: Number(y3M.toFixed(2)) },
    { tenor: "6M", label: "6-Month Yield", yieldValue: Number(y6M.toFixed(2)) },
    { tenor: "1Y", label: "1-Year Yield", yieldValue: Number(y1Y.toFixed(2)) },
    { tenor: "2Y", label: "2-Year Yield", yieldValue: Number(y2Y.toFixed(2)) },
    { tenor: "5Y", label: "5-Year Yield", yieldValue: Number(y5Y.toFixed(2)) },
    { tenor: "10Y", label: "10-Year Yield", yieldValue: Number(y10Y.toFixed(2)) },
    { tenor: "30Y", label: "30-Year Yield", yieldValue: Number(y30Y.toFixed(2)) },
  ];

  // SVG Dimension Mapping
  const width = 360;
  const height = 110;
  const paddingX = 24;
  const paddingY = 20;

  const minYield = Math.min(...points.map((p) => p.yieldValue)) - 0.4;
  const maxYield = Math.max(...points.map((p) => p.yieldValue)) + 0.4;

  const mapX = (index: number) => paddingX + (index / (points.length - 1)) * (width - 2 * paddingX);
  const mapY = (val: number) => height - paddingY - ((val - minYield) / (maxYield - minYield)) * (height - 2 * paddingY);

  const coords = points.map((p, i) => ({
    x: mapX(i),
    y: mapY(p.yieldValue),
    point: p,
  }));

  // Build SVG Path string using cubic bezier for smooth kinetic curve
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const cpX = (curr.x + next.x) / 2;
    d += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
  }

  // Area path for ambient gradient fill below the curve
  const areaD = `${d} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;

  const isInverted = safeSlope < 0;
  const strokeColor = isInverted ? "#f43f5e" : "#10b981"; // Rose if inverted, emerald if normal
  const gradientId = `yieldGradient-${isInverted ? "inverted" : "normal"}`;

  return (
    <div className={`weather-card relative p-3 text-left overflow-hidden select-none ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <p className="text-fluid-nano font-semibold tracking-[0.08em] text-white/60 uppercase">
            YIELD CURVE VECTOR
          </p>
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold uppercase tracking-wider ${
              isInverted
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}
          >
            {isInverted ? "INVERTED (10Y-2Y)" : "NORMAL SLOPE"}
          </span>
        </div>
        <p className="text-fluid-nano font-mono text-white/50">
          Slope: <span className={isInverted ? "text-rose-300 font-semibold" : "text-emerald-300 font-semibold"}>
            {safeSlope > 0 ? `+${safeSlope.toFixed(2)}` : safeSlope.toFixed(2)}%
          </span>
        </p>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          aria-label="Yield Curve Vector Plot"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Reference Baseline */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="3 3"
          />

          {/* Area Fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Kinetic Yield Curve Vector */}
          <path
            d={d}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            className="transition-all duration-500"
          />

          {/* Interactive Tenor Nodes */}
          {coords.map((c) => {
            const isHovered = hoveredPoint?.tenor === c.point.tenor;
            return (
              <g key={c.point.tenor} className="cursor-pointer">
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? "5" : "3"}
                  fill={isHovered ? strokeColor : "var(--bg-raised, #0f172a)"}
                  stroke={strokeColor}
                  strokeWidth={isHovered ? "2.5" : "1.5"}
                  className="transition-all duration-200"
                  onMouseEnter={() => setHoveredPoint(c.point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                <text
                  x={c.x}
                  y={height - 4}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.45)"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {c.point.tenor}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint ? (
          <div className="absolute top-1 right-2 pointer-events-none rounded bg-slate-900/90 border border-white/15 px-2 py-1 shadow-lg text-fluid-nano text-white/90 font-mono">
            <span className="font-semibold text-sky-300">{hoveredPoint.label}:</span>{" "}
            {hoveredPoint.yieldValue}%
          </div>
        ) : null}
      </div>
    </div>
  );
}
