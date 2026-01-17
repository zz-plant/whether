/**
 * Report section components for the Whether Report dashboard.
 * Keeps layout blocks focused and reusable across the Regime Station UI.
 */
import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { PlaybookEntry } from "../../lib/playbook";
import type {
  MacroSeriesReading,
  SensorReading,
  SeriesHistoryPoint,
  TreasuryData,
} from "../../lib/types";
import { cxoFunctionOutputs } from "../../lib/cxoFunctionOutputs";
import { operatorRequests } from "../../lib/operatorRequests";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? iso : timestampFormatter.format(date);
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
};

const formatNumber = (value: number | null, unit: string) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return `${numberFormatter.format(value)}${unit}`;
};

const clampToRange = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const mapToPercent = (value: number, min: number, max: number) => {
  const clamped = clampToRange(value, min, max);
  return ((clamped - min) / (max - min)) * 100;
};

const SPARKLINE_WIDTH = 120;
const SPARKLINE_HEIGHT = 32;
const SPARKLINE_PADDING = 4;

const buildSparkline = (history?: SeriesHistoryPoint[]) => {
  const points = (history ?? [])
    .filter((point): point is { date: string; value: number } => typeof point.value === "number")
    .map((point) => ({ value: point.value }));

  if (points.length === 0) {
    return null;
  }

  const normalizedPoints = points.length === 1 ? [points[0], points[0]] : points;
  const values = normalizedPoints.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const innerWidth = SPARKLINE_WIDTH - SPARKLINE_PADDING * 2;
  const innerHeight = SPARKLINE_HEIGHT - SPARKLINE_PADDING * 2;
  const coords = normalizedPoints.map((point, index) => {
    const x =
      SPARKLINE_PADDING + (index / (normalizedPoints.length - 1)) * innerWidth;
    const y =
      SPARKLINE_HEIGHT -
      SPARKLINE_PADDING -
      ((point.value - minValue) / range) * innerHeight;
    return { x, y };
  });

  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const first = coords[0];
  const last = coords[coords.length - 1];
  const baseY = SPARKLINE_HEIGHT - SPARKLINE_PADDING;
  const area = `${path} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;

  return { path, area };
};


const getRegimeLabel = (regime: RegimeAssessment["regime"]) => {
  switch (regime) {
    case "SCARCITY":
      return "Survival Mode";
    case "DEFENSIVE":
      return "Safety Mode";
    case "VOLATILE":
      return "Stability Mode";
    case "EXPANSION":
      return "Growth Mode";
    default:
      return regime;
  }
};

const getRegimeAccent = (regime: RegimeAssessment["regime"]) => {
  switch (regime) {
    case "SCARCITY":
      return {
        panel: "from-rose-600/20 via-rose-500/10 to-transparent border-rose-500/40",
        dot: "bg-rose-500",
        text: "text-rose-200",
      };
    case "DEFENSIVE":
      return {
        panel: "from-amber-500/20 via-amber-400/10 to-transparent border-amber-400/40",
        dot: "bg-amber-400",
        text: "text-amber-200",
      };
    case "VOLATILE":
      return {
        panel: "from-sky-500/20 via-sky-400/10 to-transparent border-sky-400/40",
        dot: "bg-sky-400",
        text: "text-sky-200",
      };
    case "EXPANSION":
      return {
        panel: "from-emerald-500/20 via-emerald-400/10 to-transparent border-emerald-400/40",
        dot: "bg-emerald-400",
        text: "text-emerald-200",
      };
    default:
      return {
        panel: "from-slate-700/20 via-slate-600/10 to-transparent border-slate-600/40",
        dot: "bg-slate-500",
        text: "text-slate-200",
      };
  }
};

export const RegimeAssessmentCard = ({
  assessment,
  provenance,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const regimeAccent = getRegimeAccent(assessment.regime);
  const hasWarnings = assessment.dataWarnings.length > 0;
  const constraintCount = assessment.constraints.length;
  const tightnessScore = clampToRange(assessment.scores.tightness, 0, 100);
  const riskScore = clampToRange(assessment.scores.riskAppetite, 0, 100);
  const progressId = `regime-progress-${assessment.regime.toLowerCase()}`;
  const tightnessGradientId = `${progressId}-tightness-gradient`;
  const riskGradientId = `${progressId}-risk-gradient`;
  const tightnessMaskId = `${progressId}-tightness-mask`;
  const riskMaskId = `${progressId}-risk-mask`;

  return (
    <section
      id="regime-assessment"
      aria-labelledby="regime-assessment-title"
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 blur-2xl" />
      <div className={`absolute inset-0 bg-gradient-to-br ${regimeAccent.panel} opacity-40`} />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="type-label text-slate-400">Current Regime</p>
          <h2 id="regime-assessment-title" className="type-section text-slate-100">
            {regimeLabel}
          </h2>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Classified as {assessment.regime}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 text-xs uppercase tracking-[0.2em] text-slate-300">
          <span className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1">
            <span className={`h-2 w-2 rounded-full ${regimeAccent.dot}`} />
            Regime status
          </span>
          <span className="rounded-full border border-slate-700 px-3 py-1">
            Tightness{" "}
            <span className="tabular-nums">{assessment.scores.tightness}</span> · Risk{" "}
            <span className="tabular-nums">{assessment.scores.riskAppetite}</span>
          </span>
        </div>
        <div className="w-full">
          <DataProvenanceStrip provenance={provenance} />
        </div>
      </div>
      <p className="relative mt-4 type-data text-slate-200 break-words">{assessment.description}</p>
      <div className="relative mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400 md:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Constraints</p>
          <p className="mt-2 text-lg font-semibold text-slate-100 tabular-nums">{constraintCount}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Capital tightness</p>
          <p className="mt-2 text-lg font-semibold text-slate-100 tabular-nums">
            {assessment.scores.tightness}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Market bravery</p>
          <p className="mt-2 text-lg font-semibold text-slate-100 tabular-nums">
            {assessment.scores.riskAppetite}
          </p>
        </div>
      </div>
      <ul className="relative mt-4 space-y-2 text-sm text-slate-300">
        {assessment.constraints.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-slate-500">•</span>
            <span className="break-words">{item}</span>
          </li>
        ))}
      </ul>
      <div className="relative mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span>Capital tightness</span>
            <span className="text-slate-200 tabular-nums">{assessment.scores.tightness}/100</span>
          </div>
          <meter
            className="sr-only"
            min={0}
            max={100}
            value={tightnessScore}
            aria-label="Capital tightness score"
          />
          <svg
            viewBox="0 0 100 8"
            className="h-2 w-full"
            aria-hidden="true"
            focusable="false"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={tightnessGradientId} x1="0" y1="0" x2="100" y2="0">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <mask id={tightnessMaskId} maskUnits="userSpaceOnUse">
                <rect width="100" height="8" rx="4" fill="#fff" />
              </mask>
            </defs>
            <g mask={`url(#${tightnessMaskId})`}>
              <rect width="100" height="8" fill="#1e293b" />
              <rect width={tightnessScore} height="8" fill={`url(#${tightnessGradientId})`} />
            </g>
          </svg>
          <p>{assessment.tightnessExplanation}</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span>Market bravery</span>
            <span className="text-slate-200 tabular-nums">{assessment.scores.riskAppetite}/100</span>
          </div>
          <meter
            className="sr-only"
            min={0}
            max={100}
            value={riskScore}
            aria-label="Market bravery score"
          />
          <svg
            viewBox="0 0 100 8"
            className="h-2 w-full"
            aria-hidden="true"
            focusable="false"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={riskGradientId} x1="0" y1="0" x2="100" y2="0">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <mask id={riskMaskId} maskUnits="userSpaceOnUse">
                <rect width="100" height="8" rx="4" fill="#fff" />
              </mask>
            </defs>
            <g mask={`url(#${riskMaskId})`}>
              <rect width="100" height="8" fill="#1e293b" />
              <rect width={riskScore} height="8" fill={`url(#${riskGradientId})`} />
            </g>
          </svg>
          <p>{assessment.riskAppetiteExplanation}</p>
        </div>
      </div>
      {hasWarnings ? (
        <div className="relative mt-6 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200">Data quality flags</p>
          <ul className="mt-3 space-y-2">
            {assessment.dataWarnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <span className="text-amber-200/80">•</span>
                <span className="break-words">{warning}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-amber-200/80">
            Scores may be less reliable when source fields are missing.
          </p>
        </div>
      ) : null}
    </section>
  );
};

export const FirstTimeGuidePanel = ({
  statusLabel,
  recordDateLabel,
  fetchedAtLabel,
}: {
  statusLabel: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
}) => (
  <section id="first-time-guide" aria-labelledby="first-time-guide-title" className="mt-10">
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="type-label text-slate-400">First-time operator guide</p>
          <h2 id="first-time-guide-title" className="type-section text-slate-100">
            Orient to the live regime briefing in three moves
          </h2>
          <p className="mt-2 type-data text-slate-300">
            This report is built to turn Treasury signals into immediate execution constraints. Start
            here to ground decisions before you dive into the data.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
          <p className="text-[10px] text-slate-500">Current snapshot</p>
          <p className="mt-2 text-[11px] text-slate-200">Status: {statusLabel}</p>
          <p className="mt-1 text-[11px] text-slate-400">Record: {recordDateLabel}</p>
          <p className="mt-1 text-[11px] text-slate-500">Fetched: {fetchedAtLabel}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "1. Scan the executive snapshot",
            detail:
              "Confirm the operating regime and the top constraints before you open deeper diagnostics.",
          },
          {
            title: "2. Validate the regime drivers",
            detail:
              "Use the signal matrix and sensor array to see which Treasury levers are tightening or loosening.",
          },
          {
            title: "3. Translate into execution moves",
            detail:
              "Use the playbook and export briefs to brief leadership with plain-English action constraints.",
          },
        ].map((step) => (
          <div
            key={step.title}
            className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm text-slate-300"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
              {step.title}
            </p>
            <p className="mt-2 text-sm text-slate-400">{step.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {[
          { href: "#executive-snapshot", label: "Executive snapshot" },
          { href: "#regime-assessment", label: "Regime assessment" },
          { href: "#playbook", label: "Playbook" },
          { href: "#export-briefs", label: "Export briefs" },
          { href: "#time-machine", label: "Time machine" },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="inline-flex min-h-[44px] items-center rounded-full border border-slate-800/70 bg-slate-950/60 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
          >
            {link.label}
          </a>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Share the URL when you lock thresholds or time machine selections so every stakeholder sees
        the same regime assumptions.
      </p>
    </div>
  </section>
);

export const OperatorRequestsPanel = ({ provenance }: { provenance: DataProvenance }) => (
  <section
    id="operator-requests"
    aria-labelledby="operator-requests-title"
    className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
  >
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="type-label text-slate-400">Post-MVP demand</p>
        <h3 id="operator-requests-title" className="type-section text-slate-100">
          Operator request backlog
        </h3>
      </div>
      <DataProvenanceStrip provenance={provenance} />
    </div>
    <p className="mt-3 max-w-3xl type-data text-slate-300">
      These are the most common expansion requests expected after launch. Delivered items are
      labeled and the remaining backlog keeps traceable data sources and plain-English operational
      guidance front and center.
    </p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {operatorRequests.map((request) => (
        <div
          key={request.title}
          className="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-4 shadow-[0_0_0_1px_rgba(15,23,42,0.4)]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{request.title}</p>
            <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
              {request.status === "DELIVERED" ? "Delivered" : "Backlog"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-200">{request.description}</p>
        </div>
      ))}
    </div>
  </section>
);

export const CxoFunctionPanel = ({ provenance }: { provenance: DataProvenance }) => (
  <section
    id="cxo-functions"
    aria-labelledby="cxo-functions-title"
    className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
  >
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="type-label text-slate-400">CXO outputs</p>
        <h3 id="cxo-functions-title" className="type-section text-slate-100">
          Executive function replacement map
        </h3>
      </div>
      <DataProvenanceStrip provenance={provenance} />
    </div>
    <p className="mt-3 max-w-3xl type-data text-slate-300">
      Each module below translates regime signals into CXO-ready artifacts. Use them to align
      finance, operations, and product leadership on a shared macro posture.
    </p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {cxoFunctionOutputs.map((item) => (
        <div
          key={item.role}
          className="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4 shadow-[0_0_0_1px_rgba(15,23,42,0.4)]"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.role}</p>
          <p className="mt-3 text-sm text-slate-200">{item.focus}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {item.outputs.map((output) => (
              <li key={output} className="flex gap-2">
                <span className="text-slate-500">•</span>
                <span className="break-words">{output}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </section>
);

export const SignalMatrixPanel = ({
  assessment,
  provenance,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const x = assessment.scores.riskAppetite;
  const y = assessment.scores.tightness;
  const matrixDotX = clampToRange(x, 0, 100);
  const matrixDotY = clampToRange(100 - y, 0, 100);
  const matrixGridId = "matrix-grid";
  const matrixGlowId = "matrix-glow";

  return (
    <section
      id="signal-matrix"
      aria-labelledby="signal-matrix-title"
      aria-describedby="signal-matrix-description"
      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3
          id="signal-matrix-title"
          className="type-label text-slate-400"
        >
          Signal Matrix
        </h3>
        <div className="flex flex-col items-end gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          <span>Tightness vs. Bravery</span>
          <DataProvenanceStrip provenance={provenance} />
        </div>
      </div>
      <figure className="mt-6">
        <div className="relative h-56 rounded-xl border border-slate-800 bg-slate-950/60">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-labelledby="signal-matrix-visual-title signal-matrix-visual-desc"
          >
            <title id="signal-matrix-visual-title">Signal matrix grid</title>
            <desc id="signal-matrix-visual-desc">
              A two-by-two matrix showing the balance of tightness and market bravery.
            </desc>
            <defs>
              <pattern
                id={matrixGridId}
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
                patternTransform="scale(1)"
              >
                <path
                  d="M 50 0 H 0 V 50"
                  fill="none"
                  stroke="rgba(30,41,59,0.9)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </pattern>
              <filter id={matrixGlowId} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="2"
                  floodColor="#fbbf24"
                  floodOpacity="0.45"
                />
              </filter>
            </defs>
            <rect width="100" height="100" fill="url(#matrix-grid)" />
            <text
              x="50"
              y="52"
              textAnchor="middle"
              fill="rgba(100,116,139,0.55)"
              fontSize="8"
              letterSpacing="6"
            >
              MATRIX
            </text>
            <circle
              cx={matrixDotX}
              cy={matrixDotY}
              r="4"
              fill="#fbbf24"
              stroke="#0f172a"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              filter={`url(#${matrixGlowId})`}
            />
            <text
              x={matrixDotX}
              y={matrixDotY + 1.2}
              textAnchor="middle"
              fontSize="6"
              fontWeight="600"
              fill="#0f172a"
              stroke="#0f172a"
              strokeWidth="0.6"
              paintOrder="stroke fill"
            >
              +
            </text>
          </svg>
          <div className="absolute bottom-2 left-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Cautious
          </div>
          <div className="absolute bottom-2 right-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Bold
          </div>
          <div className="absolute left-2 top-2 -rotate-90 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Tight
          </div>
          <div className="absolute right-2 top-2 -rotate-90 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Loose
          </div>
        </div>
        <figcaption id="signal-matrix-description" className="mt-4 text-xs text-slate-500">
          Position is derived from tightness (
          <span className="tabular-nums">{assessment.scores.tightness}</span>) and market bravery (
          <span className="tabular-nums">{assessment.scores.riskAppetite}</span>).
        </figcaption>
      </figure>
    </section>
  );
};

export const HistoricalBanner = ({ banner }: { banner: string }) => {
  return (
    <div className="mt-6 rounded-2xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
      <span className="type-label text-slate-400">Historical mode</span>
      <p className="mt-1 font-semibold text-slate-100">{banner}</p>
      <p className="mt-2 text-xs text-slate-400">
        You are viewing archived Treasury data; live signals are temporarily hidden.
      </p>
    </div>
  );
};

export const ExecutiveSnapshotPanel = ({
  treasury,
  assessment,
  provenance,
}: {
  treasury: TreasuryData;
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const curveSlope = assessment.scores.curveSlope;
  const curveLabel = curveSlope === null ? "—" : curveSlope < 0 ? "Inverted" : "Normal";
  const curveSlopePercent =
    curveSlope === null ? 50 : mapToPercent(curveSlope, -2, 2);
  const curveIndicator = clampToRange(curveSlopePercent, 0, 100);
  const curveIndicatorColor =
    curveSlope === null ? "#94a3b8" : curveSlope < 0 ? "#fb7185" : "#38bdf8";
  const curveMarkerId = "curve-marker";
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const fallbackReason = treasury.fallback_reason ?? "Fallback triggered.";

  return (
    <section id="executive-snapshot" aria-labelledby="executive-snapshot-title" className="mt-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="type-label text-slate-400">Executive snapshot</p>
            <h3 id="executive-snapshot-title" className="type-section text-slate-100">
              Operational pulse
            </h3>
          </div>
          <DataProvenanceStrip provenance={provenance} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Data freshness</p>
            <p className="mono mt-2 text-sm text-slate-100">
              <time dateTime={treasury.record_date}>{treasury.record_date}</time>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Fetched{" "}
              <time dateTime={treasury.fetched_at}>{formatTimestamp(treasury.fetched_at)}</time>
            </p>
            {isFallback ? (
              <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2 text-[11px] text-amber-100">
                <p className="uppercase tracking-[0.2em] text-amber-200">Offline fallback</p>
                <p className="mt-2 text-amber-100">{fallbackReason}</p>
                <p className="mt-2 text-amber-200/80">
                  Snapshot fetched:{" "}
                  <span className="mono">
                    <time dateTime={treasury.fetched_at}>
                      {formatTimestamp(treasury.fetched_at)}
                    </time>
                  </span>
                </p>
                <p className="text-amber-200/80">
                  Fallback activated:{" "}
                  <span className="mono">
                    {treasury.fallback_at ? (
                      <time dateTime={treasury.fallback_at}>
                        {formatTimestamp(treasury.fallback_at)}
                      </time>
                    ) : (
                      "Unknown"
                    )}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rate baseline</p>
            <p className="mono mt-2 text-sm text-slate-100">
              {formatNumber(assessment.scores.baseRate, "%")}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Using {assessment.scores.baseRateUsed} for policy anchor
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Yield curve</p>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">US 10Y</span>
                <span className="mono text-slate-100">
                  {formatNumber(treasury.yields.tenYear, "%")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">US 2Y</span>
                <span className="mono text-slate-100">
                  {formatNumber(treasury.yields.twoYear, "%")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Curve slope</span>
                <span className="mono text-slate-100">
                  {curveSlope === null ? "—" : formatNumber(curveSlope, "%")}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <svg
                viewBox="0 0 100 12"
                className="h-3 w-full"
                aria-hidden="true"
                focusable="false"
                preserveAspectRatio="none"
              >
                <defs>
                  <marker
                    id={curveMarkerId}
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    markerUnits="strokeWidth"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 6 3 L 0 6 Z" fill={curveIndicatorColor} />
                  </marker>
                </defs>
                <line
                  x1="6"
                  y1="6"
                  x2="94"
                  y2="6"
                  stroke="#1e293b"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="50"
                  y1="1"
                  x2="50"
                  y2="11"
                  stroke="#475569"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="50"
                  y1="6"
                  x2={curveIndicator}
                  y2="6"
                  stroke={curveIndicatorColor}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  markerEnd={`url(#${curveMarkerId})`}
                />
              </svg>
              <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
                <span>-2%</span>
                <span>0%</span>
                <span>+2%</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Slope is {curveLabel}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export const SensorArray = ({
  sensors,
  provenance,
}: {
  sensors: SensorReading[];
  provenance: DataProvenance;
}) => {
  return (
    <section id="sensor-array" aria-labelledby="sensor-array-title" className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="sensor-array-title" className="type-label text-slate-400">
          Live Sensor Array
        </h3>
        <DataProvenanceStrip provenance={provenance} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {sensors.map((sensor) => {
          const sparkline = buildSparkline(sensor.history);
          const sparklineId = `sensor-spark-${sensor.id}`;

          return (
            <div
              key={sensor.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-slate-300 break-words">{sensor.label}</p>
                  <p className="mono mt-2 text-2xl text-slate-100">
                    {formatNumber(sensor.value, sensor.unit)}
                  </p>
                </div>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {sensor.isLive ? "Live" : "Offline"}
                </span>
              </div>
              <figure className="mt-3">
                {sparkline ? (
                  <svg
                    viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                    className="h-8 w-full"
                    aria-hidden="true"
                    focusable="false"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id={sparklineId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(56,189,248,0.35)" />
                        <stop offset="100%" stopColor="rgba(56,189,248,0)" />
                      </linearGradient>
                    </defs>
                    <path d={sparkline.area} fill={`url(#${sparklineId})`} pathLength={100} />
                    <path
                      d={sparkline.path}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                      pathLength={100}
                    />
                  </svg>
                ) : (
                  <div
                    className="h-8 rounded-md border border-slate-800/80 bg-slate-950/80"
                    aria-hidden="true"
                  />
                )}
                <figcaption className="mt-3 text-xs text-slate-400 break-words">
                  {sensor.explanation}
                </figcaption>
              </figure>
              <div className="mt-4 text-xs text-slate-500">
                <p className="break-words">
                  Source:{" "}
                  <a
                    href={sensor.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="touch-target text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
                  >
                    {sensor.sourceLabel}
                  </a>
                </p>
                <p>
                  Formula:{" "}
                  <a
                    href={sensor.formulaUrl}
                    className="touch-target text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
                  >
                    Method notes
                  </a>
                </p>
                <p>
                  Record date:{" "}
                  <time dateTime={sensor.record_date}>{formatDate(sensor.record_date)}</time>
                </p>
                <p>
                  Fetched:{" "}
                  <time dateTime={sensor.fetched_at}>{formatTimestamp(sensor.fetched_at)}</time>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const MacroSignalsPanel = ({
  series,
  provenance,
}: {
  series: MacroSeriesReading[];
  provenance: DataProvenance;
}) => {
  const isLive = series.some((signal) => signal.isLive);

  return (
    <section id="macro-signals" aria-labelledby="macro-signals-title" className="mt-10">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Macro signals</p>
            <h3 id="macro-signals-title" className="type-section text-slate-100">
              Expanded signal pack
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Supplement Treasury yields with inflation, labor health, and credit stress indicators.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
              {isLive ? "Live" : "Snapshot"}
            </span>
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {series.map((signal) => {
            const sparkline = buildSparkline(signal.history);
            const sparklineId = `macro-spark-${signal.id}`;

            return (
              <div
                key={signal.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-[0_0_0_1px_rgba(15,23,42,0.4)]"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{signal.label}</p>
                <p className="mono mt-3 text-2xl text-slate-100">
                  {formatNumber(signal.value, signal.unit)}
                </p>
                <figure className="mt-3">
                  {sparkline ? (
                    <svg
                      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                      className="h-8 w-full"
                      aria-hidden="true"
                      focusable="false"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id={sparklineId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(251,191,36,0.3)" />
                          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
                        </linearGradient>
                      </defs>
                      <path d={sparkline.area} fill={`url(#${sparklineId})`} pathLength={100} />
                      <path
                        d={sparkline.path}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        pathLength={100}
                      />
                    </svg>
                  ) : (
                    <div
                      className="h-8 rounded-md border border-slate-800/80 bg-slate-950/80"
                      aria-hidden="true"
                    />
                  )}
                  <figcaption className="mt-2 text-xs text-slate-500">
                    {signal.explanation}
                  </figcaption>
                </figure>
                <div className="mt-3 text-xs text-slate-500">
                  <p className="break-words">
                    Source:{" "}
                    <a
                      href={signal.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="touch-target text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
                    >
                      {signal.sourceLabel}
                    </a>
                  </p>
                  <p>
                    Formula:{" "}
                    <a
                      href={signal.formulaUrl}
                      className="touch-target text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
                    >
                      Method notes
                    </a>
                  </p>
                  <p>
                    Record date:{" "}
                    <time dateTime={signal.record_date}>{formatDate(signal.record_date)}</time>
                  </p>
                  <p>
                    Fetched:{" "}
                    <time dateTime={signal.fetched_at}>{formatTimestamp(signal.fetched_at)}</time>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const PlaybookPanel = ({
  playbook,
  stopItems,
  startItems,
  fenceItems,
  provenance,
}: {
  playbook: PlaybookEntry | null;
  stopItems: string[];
  startItems: string[];
  fenceItems: string[];
  provenance: DataProvenance;
}) => {
  return (
    <section id="playbook" aria-labelledby="playbook-title" className="mt-10">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Playbook</p>
            <h3 id="playbook-title" className="type-section text-slate-100">
              {playbook?.title ?? "Operational Guidance"}
            </h3>
            {playbook ? (
              <p className="mt-2 type-data text-slate-300 break-words">{playbook.insight}</p>
            ) : (
              <p className="mt-2 type-data text-slate-300">
                Playbook data unavailable. Use regime constraints as guardrails.
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            {playbook ? (
              <div className="text-right text-xs text-slate-400">
                <p>{playbook.tone}</p>
                <p className="mt-1 text-slate-300">Mandate: {playbook.mandate}</p>
                <p className="mt-1 text-slate-500">Metric: {playbook.metric}</p>
              </div>
            ) : null}
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Stop</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {stopItems.map((item) => (
                <li key={item} className="break-words">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Start</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {startItems.map((item) => (
                <li key={item} className="break-words">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Fence</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {fenceItems.map((item) => (
                <li key={item} className="break-words">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {playbook ? (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <details open>
              <summary className="min-h-[44px] cursor-pointer text-xs uppercase tracking-[0.2em] text-slate-400 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                Leadership signals (phrases to use or avoid)
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                    More often
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {playbook.leadershipPhrases.more.map((item) => (
                      <li key={item} className="break-words">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-rose-200">Less often</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {playbook.leadershipPhrases.less.map((item) => (
                      <li key={item} className="break-words">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          </div>
        ) : null}
      </div>
    </section>
  );
};
