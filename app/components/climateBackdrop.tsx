"use client";

import React from "react";
import { RegimeIconType } from "./regimeIcons";

export const ClimateBackdrop = ({ regime }: { regime: RegimeIconType | "NEUTRAL" }) => {
    const getRegimeStyles = (r: typeof regime) => {
        switch (r) {
            case "EXPANSION":
                return {
                    primary: "rgba(20, 184, 166, 0.15)", // Teal
                    secondary: "rgba(34, 197, 94, 0.1)", // Green
                    animation: "aurora-shift",
                };
            case "VOLATILE":
                return {
                    primary: "rgba(14, 165, 233, 0.12)", // Sky
                    secondary: "rgba(99, 102, 241, 0.1)", // Indigo
                    animation: "display-drift",
                };
            case "DEFENSIVE":
                return {
                    primary: "rgba(245, 158, 11, 0.08)", // Amber
                    secondary: "rgba(71, 85, 105, 0.1)", // Slate
                    animation: "pulse-slow",
                };
            case "SCARCITY":
                return {
                    primary: "rgba(244, 63, 94, 0.1)", // Rose
                    secondary: "rgba(15, 23, 42, 0.2)", // Dark
                    animation: "sheen",
                };
            default:
                return {
                    primary: "rgba(125, 211, 252, 0.1)",
                    secondary: "rgba(99, 102, 241, 0.09)",
                    animation: "none",
                };
        }
    };

    const styles = getRegimeStyles(regime);

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Dynamic atmospheric layer */}
            <div
                className="absolute inset-0 transition-colors duration-1000 ease-in-out"
                style={{
                    backgroundImage: `
            radial-gradient(1200px 800px at 50% -10%, ${styles.primary}, transparent 70%),
            radial-gradient(800px 600px at 10% 90%, ${styles.secondary}, transparent 80%),
            radial-gradient(800px 600px at 90% 90%, ${styles.primary}, transparent 80%)
          `
                }}
            />

            {/* Animated noise/grain layer or "particles" */}
            <div
                className={`absolute inset-0 opacity-30 mix-blend-overlay ${styles.animation !== 'none' ? 'animate-' + styles.animation : ''}`}
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    filter: 'contrast(120%) brightness(100%)',
                }}
            />

            {/* Glassmorphism gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950" />
        </div>
    );
};
