"use client";

import React from "react";

export type RegimeIconType = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION" | "NEUTRAL";

const SnowflakeIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} animate-float`} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M12 2v20M3.5 12h17M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeOpacity="0.5" />
    <path d="M12 2v4M12 18v4M3.5 12h4M16.5 12h4" strokeLinecap="round" />
    <path d="M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" strokeLinecap="round" strokeOpacity="0.4" />
    <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

const CloudIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} animate-drift`} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M7 16c-2.2 0-4-1.8-4-4s1.8-4 4-4c0-2.2 1.8-4 4-4 1.8 0 3.3 1.2 3.8 2.9C15.6 6.3 17 7.5 17 9c1.7 0 3 1.3 3 3s-1.3 3-3 3H7z" strokeLinejoin="round" />
    <line x1="6" y1="17" x2="8" y2="15" strokeWidth="1.2" strokeOpacity="0.4" />
    <line x1="14" y1="18" x2="16" y2="17" strokeWidth="1.2" strokeOpacity="0.4" />
  </svg>
);

const StormIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} animate-flash`} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M7 14c-2.2 0-4-1.8-4-4s1.8-4 4-4c0-2.2 1.8-4 4-4 1.8 0 3.3 1.2 3.8 2.9C15.6 4.3 17 5.5 17 7c1.7 0 3 1.3 3 3s-1.3 3-3 3H7z" strokeLinejoin="round" strokeOpacity="0.6" />
    <path d="M12 14l-2 5h3l-1.5 5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    <path d="M9 11h.01M14 10h.01" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const SunIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} animate-glow`} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.15" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" strokeLinecap="round" strokeOpacity="0.6" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.25" />
  </svg>
);

export const RegimeStatusIcon = ({ regime, className = "h-6 w-6" }: { regime: RegimeIconType, className?: string }) => {
    switch (regime) {
        case "SCARCITY":
            return <SnowflakeIcon className={className} />;
        case "DEFENSIVE":
            return <CloudIcon className={className} />;
        case "VOLATILE":
            return <StormIcon className={className} />;
        case "EXPANSION":
            return <SunIcon className={className} />;
        default:
            return <CloudIcon className={className} />;
    }
};

export const RegimeBadgeIcon = ({ icon, className = "h-4 w-4" }: { icon: "snowflake" | "cloud" | "storm" | "sun", className?: string }) => {
    switch (icon) {
        case "snowflake":
            return <SnowflakeIcon className={className} />;
        case "cloud":
            return <CloudIcon className={className} />;
        case "storm":
            return <StormIcon className={className} />;
        case "sun":
            return <SunIcon className={className} />;
        default:
            return <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />;
    }
};
