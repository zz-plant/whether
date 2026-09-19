import type { SVGProps } from "react";

type OperatingLoopGlyphProps = SVGProps<SVGSVGElement> & {
  activeStep?: "signals" | "posture" | "plan" | "share";
  variant?: "compact" | "detailed";
  className?: string;
};

/**
 * Visualizes the 4-part Whether decision loop:
 * Signals (Macro telemetry) → Posture (Operating regime) → Plan (Bounded rules) → Share (Citable artifact)
 */
export function OperatingLoopGlyph({
  activeStep,
  variant = "compact",
  className = "",
  ...props
}: OperatingLoopGlyphProps) {
  if (variant === "compact") {
    return (
      <svg
        viewBox="0 0 260 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full max-w-[260px] h-auto ${className}`}
        aria-label="Whether operating loop: Signals to Posture to Plan to Share"
        {...props}
      >
        <title>Whether Operating Loop</title>
        <desc>Four stages: Signals, Posture, Plan, and Share</desc>

        {/* Connecting connector track */}
        <line
          x1="20"
          y1="14"
          x2="240"
          y2="14"
          stroke="var(--border-default)"
          strokeWidth="2"
          strokeDasharray="3 3"
        />

        {/* Step 1: Signals */}
        <g opacity={!activeStep || activeStep === "signals" ? 1 : 0.45}>
          <circle
            cx="20"
            cy="14"
            r="8"
            fill={activeStep === "signals" ? "var(--bg-panel)" : "var(--bg-body)"}
            stroke={activeStep === "signals" ? "var(--accent-info)" : "var(--border-strong)"}
            strokeWidth={activeStep === "signals" ? "2.5" : "1.5"}
          />
          <path
            d="M17 14.5L19 12.5L21 15.5L23 11.5"
            stroke={activeStep === "signals" ? "var(--accent-info)" : "var(--app-text-muted)"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="20"
            y="26"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight={activeStep === "signals" ? "600" : "500"}
            fill={activeStep === "signals" ? "var(--app-text)" : "var(--app-text-muted)"}
            letterSpacing="0.04em"
          >
            SIGNALS
          </text>
        </g>

        {/* Step 2: Posture */}
        <g opacity={!activeStep || activeStep === "posture" ? 1 : 0.45}>
          <circle
            cx="93"
            cy="14"
            r="8"
            fill={activeStep === "posture" ? "var(--bg-panel)" : "var(--bg-body)"}
            stroke={activeStep === "posture" ? "var(--regime-accent, var(--accent-info))" : "var(--border-strong)"}
            strokeWidth={activeStep === "posture" ? "2.5" : "1.5"}
          />
          {/* Compass / Weather glyph */}
          <circle
            cx="93"
            cy="14"
            r="3"
            fill="none"
            stroke={activeStep === "posture" ? "var(--regime-ink, var(--accent-info))" : "var(--app-text-muted)"}
            strokeWidth="1.2"
          />
          <path
            d="M93 9.5V11M93 17V18.5M88.5 14H90M96 14H97.5"
            stroke={activeStep === "posture" ? "var(--regime-ink, var(--accent-info))" : "var(--app-text-muted)"}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <text
            x="93"
            y="26"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight={activeStep === "posture" ? "600" : "500"}
            fill={activeStep === "posture" ? "var(--app-text)" : "var(--app-text-muted)"}
            letterSpacing="0.04em"
          >
            POSTURE
          </text>
        </g>

        {/* Step 3: Plan */}
        <g opacity={!activeStep || activeStep === "plan" ? 1 : 0.45}>
          <circle
            cx="166"
            cy="14"
            r="8"
            fill={activeStep === "plan" ? "var(--bg-panel)" : "var(--bg-body)"}
            stroke={activeStep === "plan" ? "var(--accent-warning)" : "var(--border-strong)"}
            strokeWidth={activeStep === "plan" ? "2.5" : "1.5"}
          />
          {/* Bounded corridor gate */}
          <path
            d="M163 11V17M169 11V17M163 14H169"
            stroke={activeStep === "plan" ? "var(--accent-warning)" : "var(--app-text-muted)"}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <text
            x="166"
            y="26"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight={activeStep === "plan" ? "600" : "500"}
            fill={activeStep === "plan" ? "var(--app-text)" : "var(--app-text-muted)"}
            letterSpacing="0.04em"
          >
            PLAN
          </text>
        </g>

        {/* Step 4: Share / Artifact */}
        <g opacity={!activeStep || activeStep === "share" ? 1 : 0.45}>
          <circle
            cx="240"
            cy="14"
            r="8"
            fill={activeStep === "share" ? "var(--bg-panel)" : "var(--bg-body)"}
            stroke={activeStep === "share" ? "var(--accent-success)" : "var(--border-strong)"}
            strokeWidth={activeStep === "share" ? "2.5" : "1.5"}
          />
          {/* Artifact document icon */}
          <rect
            x="237"
            y="11"
            width="6"
            height="7"
            rx="1"
            stroke={activeStep === "share" ? "var(--accent-success)" : "var(--app-text-muted)"}
            strokeWidth="1.2"
            fill="none"
          />
          <text
            x="240"
            y="26"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight={activeStep === "share" ? "600" : "500"}
            fill={activeStep === "share" ? "var(--app-text)" : "var(--app-text-muted)"}
            letterSpacing="0.04em"
          >
            ARTIFACT
          </text>
        </g>
      </svg>
    );
  }

  // Detailed variant for /about
  return (
    <svg
      viewBox="0 0 640 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full max-w-2xl h-auto ${className}`}
      aria-label="Whether Core Operating Loop Diagram"
      {...props}
    >
      <title>Whether Decision Transmission Pipeline</title>
      <desc>
        Public macro data from FRED feeds the Quantitative Regime Engine, which sets the Weekly Posture and generates meeting-ready artifacts.
      </desc>

      <defs>
        <linearGradient id="loopFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent-info)" stopOpacity="0.4" />
          <stop offset="50%" stopColor="var(--regime-accent, var(--accent-info))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--accent-success)" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Connection rails */}
      <path
        d="M95 60 H 215 M275 60 H 395 M455 60 H 575"
        stroke="url(#loopFlowGrad)"
        strokeWidth="2.5"
        strokeDasharray="4 4"
      />

      {/* Stage 1: Public Signals */}
      <g transform="translate(40, 25)">
        <rect
          width="110"
          height="70"
          rx="8"
          fill="var(--bg-panel)"
          stroke="var(--border-default)"
          strokeWidth="1.5"
        />
        <circle cx="55" cy="22" r="10" fill="var(--bg-nested-light)" stroke="var(--accent-info)" strokeWidth="1.5" />
        <path d="M50 24L53 20L57 23L60 19" stroke="var(--accent-info)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <text x="55" y="46" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--app-text)">Public Signals</text>
        <text x="55" y="58" textAnchor="middle" fontSize="8.5" fill="var(--app-text-muted)">FRED & Treasury feeds</text>
      </g>

      {/* Stage 2: Quantitative Regime */}
      <g transform="translate(200, 25)">
        <rect
          width="110"
          height="70"
          rx="8"
          fill="var(--bg-panel)"
          stroke="var(--regime-accent, var(--accent-info))"
          strokeWidth="1.5"
        />
        <circle cx="55" cy="22" r="10" fill="var(--bg-nested-light)" stroke="var(--regime-ink, var(--accent-info))" strokeWidth="1.5" />
        <circle cx="55" cy="22" r="4" fill="none" stroke="var(--regime-ink, var(--accent-info))" strokeWidth="1.5" />
        <text x="55" y="46" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--app-text)">Posture Engine</text>
        <text x="55" y="58" textAnchor="middle" fontSize="8.5" fill="var(--app-text-muted)">4 Weather Regimes</text>
      </g>

      {/* Stage 3: Bounded Decision */}
      <g transform="translate(360, 25)">
        <rect
          width="110"
          height="70"
          rx="8"
          fill="var(--bg-panel)"
          stroke="var(--border-default)"
          strokeWidth="1.5"
        />
        <circle cx="55" cy="22" r="10" fill="var(--bg-nested-light)" stroke="var(--accent-warning)" strokeWidth="1.5" />
        <path d="M51 19V25M59 19V25M51 22H59" stroke="var(--accent-warning)" strokeWidth="1.8" strokeLinecap="round" />
        <text x="55" y="46" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--app-text)">Bounded Plan</text>
        <text x="55" y="58" textAnchor="middle" fontSize="8.5" fill="var(--app-text-muted)">Action + Reversal</text>
      </g>

      {/* Stage 4: Board/Slack Artifact */}
      <g transform="translate(520, 25)">
        <rect
          width="110"
          height="70"
          rx="8"
          fill="var(--bg-panel)"
          stroke="var(--accent-success)"
          strokeWidth="1.5"
        />
        <circle cx="55" cy="22" r="10" fill="var(--bg-nested-light)" stroke="var(--accent-success)" strokeWidth="1.5" />
        <rect x="50" y="17" width="10" height="11" rx="1.5" stroke="var(--accent-success)" strokeWidth="1.5" fill="none" />
        <line x1="53" y1="21" x2="57" y2="21" stroke="var(--accent-success)" strokeWidth="1.2" />
        <line x1="53" y1="24" x2="56" y2="24" stroke="var(--accent-success)" strokeWidth="1.2" />
        <text x="55" y="46" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--app-text)">Shared Artifact</text>
        <text x="55" y="58" textAnchor="middle" fontSize="8.5" fill="var(--app-text-muted)">Meeting & Slack block</text>
      </g>

      <text x="320" y="122" textAnchor="middle" fontSize="9.5" fill="var(--app-text-muted)" letterSpacing="0.02em">
        Signals → Posture → Bounded Decision → Shareable Artifact
      </text>
    </svg>
  );
}
