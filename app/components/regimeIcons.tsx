"use client";

import React from "react";

export type RegimeIconType = "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION" | "NEUTRAL";

export const RegimeStatusIcon = ({ regime, className = "h-6 w-6" }: { regime: RegimeIconType, className?: string }) => {
    switch (regime) {
        case "SCARCITY":
            return (
                <svg viewBox="0 0 24 24" className={`${className} animate-pulse-slow`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 3l7 3v5c0 5-3.4 8.5-7 10-3.6-1.5-7-5-7-10V6l7-3z" className="animate-shield-ripple" />
                </svg>
            );
        case "DEFENSIVE":
            return (
                <svg viewBox="0 0 24 24" className={`${className} animate-sheen`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 118 0v3" />
                </svg>
            );
        case "VOLATILE":
            return (
                <svg viewBox="0 0 24 24" className={`${className} animate-sway`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 4v15" />
                    <path d="M6 8h12" />
                    <path d="M4 8l-2 4h4l-2-4zm16 0l-2 4h4l-2-4z" />
                    <path d="M9 19h6" />
                </svg>
            );
        case "EXPANSION":
            return (
                <svg viewBox="0 0 24 24" className={`${className} animate-vibrate`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M14 4c3 0 6 3 6 6-2 .3-4.4 1.6-6.3 3.5C11.7 15.5 10.3 18 10 20c-3 0-6-3-6-6 2-.3 4.4-1.7 6.4-3.7C12.3 8.4 13.7 6 14 4z" />
                    <circle cx="14.5" cy="9.5" r="1.3" />
                    <path d="M7 17l-3 3" />
                </svg>
            );
        default:
            return (
                <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            );
    }
};

export const RegimeBadgeIcon = ({ icon, className = "h-4 w-4" }: { icon: "shield" | "lock" | "balance" | "rocket", className?: string }) => {
    switch (icon) {
        case "shield":
            return (
                <svg viewBox="0 0 24 24" className={`${className} animate-pulse-slow`} fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 3l7 3v5c0 5-3.4 8.5-7 10-3.6-1.5-7-5-7-10V6l7-3z" />
                </svg>
            );
        case "lock":
            return (
                <svg viewBox="0 0 24 24" className={`${className} animate-sheen`} fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 118 0v3" />
                </svg>
            );
        case "balance":
            return (
                <svg viewBox="0 0 24 24" className={`${className} animate-sway`} fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 4v15" />
                    <path d="M6 8h12" />
                    <path d="M4 8l-2 4h4l-2-4zm16 0l-2 4h4l-2-4z" />
                    <path d="M9 19h6" />
                </svg>
            );
        case "rocket":
            return (
                <svg viewBox="0 0 24 24" className={`${className} animate-vibrate`} fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M14 4c3 0 6 3 6 6-2 .3-4.4 1.6-6.3 3.5C11.7 15.5 10.3 18 10 20c-3 0-6-3-6-6 2-.3 4.4-1.7 6.4-3.7C12.3 8.4 13.7 6 14 4z" />
                    <circle cx="14.5" cy="9.5" r="1.3" />
                    <path d="M7 17l-3 3" />
                </svg>
            );
        default:
            return <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />;
    }
};
