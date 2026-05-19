"use client";

type RegimeCompassProps = {
  tightness: number;
  riskAppetite: number;
  prevTightness?: number;
  prevRiskAppetite?: number;
  tightnessThreshold?: number;
  riskAppetiteThreshold?: number;
  regimeKey?: string;
};

const REGIME_QUADRANTS: Record<string, { label: string; cx: number; cy: number }> = {
  SCARCITY: { label: "Scarcity", cx: 0.8, cy: 0.2 },
  DEFENSIVE: { label: "Defensive", cx: 0.8, cy: 0.8 },
  VOLATILE: { label: "Volatile", cx: 0.2, cy: 0.2 },
  EXPANSION: { label: "Expansion", cx: 0.2, cy: 0.8 },
};

export function RegimeCompass({
  tightness,
  riskAppetite,
  prevTightness,
  prevRiskAppetite,
  tightnessThreshold = 70,
  riskAppetiteThreshold = 50,
  regimeKey,
}: RegimeCompassProps) {
  const M = 32; // margin for labels
  const W = 156; // chart area width (fits in 220 viewBox)
  const H = 156; // chart area height

  const toX = (t: number) => M + (t / 100) * W;
  const toY = (ra: number) => M + (1 - ra / 100) * H;

  const currentX = toX(tightness);
  const currentY = toY(riskAppetite);
  const hasPrev = prevTightness !== undefined && prevRiskAppetite !== undefined;
  const prevX = hasPrev ? toX(prevTightness!) : currentX;
  const prevY = hasPrev ? toY(prevRiskAppetite!) : currentY;

  const thresholdX = toX(tightnessThreshold);
  const thresholdY = toY(riskAppetiteThreshold);

  return (
    <svg
      viewBox="0 0 220 180"
      className="w-full max-w-[20rem] h-auto"
      role="img"
      aria-label={`Posture quadrant: ${regimeKey ? `${regimeKey} regime` : "Unknown"}. Credit conditions ${tightness}/100, investor sentiment ${riskAppetite}/100. ${regimeKey === "EXPANSION" ? "Credit is available, investors are optimistic — scale proven bets." : regimeKey === "SCARCITY" ? "Credit is tight, investors are cautious — preserve cash." : regimeKey === "DEFENSIVE" ? "Credit is tight but investors are willing to fund." : regimeKey === "VOLATILE" ? "Credit is available but investors are cautious — conditions can shift quickly." : ""}`}
    >
      {/* Background fill per quadrant */}
      {/* Bottom-left: VOLATILE — low tightness, low risk appetite */}
      <rect x={M} y={thresholdY} width={thresholdX - M} height={H - (thresholdY - M)} fill="rgba(71,85,105,0.12)" rx="0" />
      {/* Top-left: SCARCITY — high tightness, low risk appetite */}
      <rect x={thresholdX} y={thresholdY} width={W - (thresholdX - M)} height={H - (thresholdY - M)} fill="rgba(251,191,36,0.08)" rx="0" />
      {/* Bottom-right: EXPANSION — low tightness, high risk appetite */}
      <rect x={M} y={M} width={thresholdX - M} height={thresholdY - M} fill="rgba(52,211,153,0.08)" rx="0" />
      {/* Top-right: DEFENSIVE — high tightness, high risk appetite */}
      <rect x={thresholdX} y={M} width={W - (thresholdX - M)} height={thresholdY - M} fill="rgba(251,191,36,0.08)" rx="0" />

      {/* Quadrant labels */}
      <text x={M + 6} y={M + 14} fill="rgba(148,163,184,0.5)" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans, sans-serif">
        Expansion
      </text>
      <text x={thresholdX + 6} y={M + 14} fill="rgba(148,163,184,0.5)" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans, sans-serif">
        Defensive
      </text>
      <text x={M + 6} y={thresholdY + 14} fill="rgba(148,163,184,0.5)" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans, sans-serif">
        Volatile
      </text>
      <text x={thresholdX + 6} y={thresholdY + 14} fill="rgba(148,163,184,0.5)" fontSize="10" fontWeight="600" fontFamily="IBM Plex Sans, sans-serif">
        Scarcity
      </text>

      {/* Threshold lines */}
      <line x1={thresholdX} y1={M} x2={thresholdX} y2={M + H} stroke="rgba(148,163,184,0.25)" strokeWidth="1" strokeDasharray="4 3" />
      <line x1={M} y1={thresholdY} x2={M + W} y2={thresholdY} stroke="rgba(148,163,184,0.25)" strokeWidth="1" strokeDasharray="4 3" />

      {/* Border */}
      <rect x={M} y={M} width={W} height={H} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="1" rx="2" />

      {/* Trajectory arrow — shows movement from last week */}
      {hasPrev && (prevX !== currentX || prevY !== currentY) ? (
        <>
          <line x1={prevX} y1={prevY} x2={currentX} y2={currentY} stroke="rgba(125,211,252,0.6)" strokeWidth="2" />
          <circle cx={prevX} cy={prevY} r="4" fill="rgba(125,211,252,0.2)" stroke="rgba(125,211,252,0.5)" strokeWidth="1.5" />
        </>
      ) : null}

      {/* Current position */}
      <circle cx={currentX} cy={currentY} r="6" fill="rgba(56,189,248,0.95)" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx={currentX} cy={currentY} r="12" fill="rgba(56,189,248,0.12)" stroke="none" />
      <circle cx={currentX} cy={currentY} r="20" fill="rgba(56,189,248,0.04)" stroke="none" />

      {/* Axis labels */}
      <text x={M + W / 2} y={M + H + 16} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="9" fontWeight="500" fontFamily="IBM Plex Sans, sans-serif">
        Tightness →
      </text>
      <text x={M - 8} y={M + H / 2} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="9" fontWeight="500" fontFamily="IBM Plex Sans, sans-serif" transform={`rotate(-90, ${M - 8}, ${M + H / 2})`}>
        Risk appetite ↑
      </text>

      {/* Score labels at current position */}
      {tightness > 80 ? (
        <text x={currentX - 6} y={currentY - 11} textAnchor="end" fill="rgba(148,163,184,0.7)" fontSize="8" fontFamily="IBM Plex Sans, sans-serif">
          T{tightness}
        </text>
      ) : (
        <text x={currentX + 10} y={currentY + 4} fill="rgba(148,163,184,0.7)" fontSize="8" fontFamily="IBM Plex Sans, sans-serif">
          T{tightness} R{riskAppetite}
        </text>
      )}
    </svg>
  );
}
