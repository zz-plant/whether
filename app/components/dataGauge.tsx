"use client";

import React, { useMemo } from "react";

interface DataGaugeProps {
    value: number;
    threshold?: number;
    label: string;
    unit?: string;
    color?: "sky" | "rose" | "emerald" | "amber";
    min?: number;
    max?: number;
}

export const DataGauge = ({
    value,
    threshold,
    label,
    unit = "",
    color = "sky",
    min = 0,
    max = 100,
}: DataGaugeProps) => {
    const normalizedValue = Math.min(Math.max(value, min), max);
    const percentage = ((normalizedValue - min) / (max - min)) * 100;

    // SVG arc parameters
    const radius = 40;
    const strokeWidth = 8;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const colorClasses = {
        sky: "stroke-sky-400 text-sky-400",
        rose: "stroke-rose-400 text-rose-400",
        emerald: "stroke-emerald-400 text-emerald-400",
        amber: "stroke-amber-400 text-amber-400",
    };

    const trackColor = "stroke-slate-800/60";

    return (
        <div className="flex flex-col items-center gap-2 group">
            <div className="relative h-24 w-24">
                {/* Background Track */}
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 80 80">
                    <circle
                        className={trackColor}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={normalizedRadius}
                        cx="40"
                        cy="40"
                    />
                    {/* Progress Arc */}
                    <circle
                        className={`${colorClasses[color]} transition-all duration-1000 ease-out`}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${circumference} ${circumference}`}
                        style={{ strokeDashoffset }}
                        strokeLinecap="round"
                        fill="transparent"
                        r={normalizedRadius}
                        cx="40"
                        cy="40"
                    />
                    {/* Threshold Marker */}
                    {threshold !== undefined && (
                        <line
                            x1="40"
                            y1="8"
                            x2="40"
                            y2="14"
                            className="stroke-white/40"
                            transform={`rotate(${(threshold / max) * 360} 40 40)`}
                            strokeWidth="2"
                        />
                    )}
                </svg>

                {/* Value Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold tracking-tight text-slate-100">
                        {value}{unit}
                    </span>
                </div>
            </div>

            <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-300 transition-colors">
                    {label}
                </p>
            </div>
        </div>
    );
};
