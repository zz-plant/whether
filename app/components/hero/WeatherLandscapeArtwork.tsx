
interface WeatherLandscapeArtworkProps {
  regime: string;
  className?: string;
}

export function WeatherLandscapeArtwork({ regime, className = "" }: WeatherLandscapeArtworkProps) {
  const r = (regime ?? "").toString().toUpperCase();
  const isSunny = r === "EXPANSION" || r === "SUNNY";
  const isCloudy = r === "DEFENSIVE" || r === "CLOUDY";
  const isStormy = r === "VOLATILE" || r === "STORMY";
  const isFreezing = r === "SCARCITY" || r === "FREEZING";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative overflow-hidden select-none ${className}`}
    >
      <svg
        viewBox="0 0 260 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full object-cover object-right-bottom"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Radial Glows */}
          <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#fde047" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#2dd4bf" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0d3532" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="cloudy-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#334155" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="freezing-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#0284c7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
          </radialGradient>

          {/* Ridge Gradients - subtle, atmospheric transitions */}
          <linearGradient id="ridge-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#115e59" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#042f2e" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="ridge-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#042f2e" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="ridge-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#042f2e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#021c1c" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Ambient celestial body / glow */}
        {isSunny && (
          <>
            {/* Diffused outer aura */}
            <circle cx="195" cy="65" r="75" fill="url(#sun-glow)" opacity="0.45" />
            {/* Crisp glowing sun sphere */}
            <circle cx="195" cy="65" r="24" fill="#fef08a" opacity="0.75" />
          </>
        )}

        {isCloudy && (
          <>
            <circle cx="190" cy="70" r="80" fill="url(#cloudy-glow)" opacity="0.4" />
            {/* Soft cloud silhouettes */}
            <path
              d="M140 75 C140 65 155 58 170 63 C180 52 205 52 215 62 C225 60 238 68 238 78 Z"
              fill="#475569"
              fillOpacity="0.25"
            />
          </>
        )}

        {isStormy && (
          <>
            <circle cx="190" cy="65" r="70" fill="url(#sun-glow)" opacity="0.2" />
            <path
              d="M150 70 C160 55 190 55 200 65 C215 60 235 70 235 85 Z"
              fill="#334155"
              fillOpacity="0.35"
            />
          </>
        )}

        {isFreezing && (
          <>
            <circle cx="195" cy="65" r="70" fill="url(#freezing-glow)" opacity="0.35" />
            <circle cx="195" cy="65" r="18" fill="#e0f2fe" fillOpacity="0.5" />
          </>
        )}

        {/* Background Mountain Layer */}
        <path
          d="M70 160 L120 105 C140 88 165 92 185 108 L230 140 L260 148 L260 160 Z"
          fill="url(#ridge-back)"
        />

        {/* Mid Ridge with glowing crest */}
        <path
          d="M110 160 L160 112 C180 96 210 100 235 118 L260 132 L260 160 Z"
          fill="url(#ridge-mid)"
        />
        <path
          d="M110 160 L160 112 C180 96 210 100 235 118 L260 132"
          stroke="#5eead4"
          strokeWidth="0.75"
          strokeOpacity="0.2"
        />

        {/* Foreground Rolling Slopes */}
        <path
          d="M0 160 L0 145 C45 130 95 138 140 120 C180 105 220 115 260 95 L260 160 Z"
          fill="url(#ridge-front)"
        />
        <path
          d="M0 145 C45 130 95 138 140 120 C180 105 220 115 260 95"
          stroke="#2dd4bf"
          strokeWidth="1"
          strokeOpacity="0.25"
        />
      </svg>
    </div>
  );
}
