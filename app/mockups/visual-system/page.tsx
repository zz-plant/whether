"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ParametricGraphic } from "../../components/ParametricGraphic";
import { deriveVisualTokenMatrix } from "../../../lib/graphics/generatorEngine";
import type { ShaderMode } from "../../../lib/identicon/shaderEngine";
import { Sparkles, Sliders, Layers, RefreshCw, Cpu, Image } from "lucide-react";

export default function VisualSystemMockupPage() {
  const [seed, setSeed] = useState("report-snapshot-2026-07-30-canonical");
  const [mode, setMode] = useState<ShaderMode>("reportSeal");
  const [tier, setTier] = useState<"auto" | "svg" | "filter" | "webgl">("auto");
  const [size, setSize] = useState(140);
  const [metric, setMetric] = useState(0.75);

  const matrix = deriveVisualTokenMatrix(seed, metric);

  return (
    <main id="main-content" className="weather-page-shell weather-page-shell-wide min-h-screen pb-16">
      {/* Header Banner */}
      <section className="weather-panel rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6 sm:p-10 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 type-eyebrow text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" /> Architectural Visual Language
              </span>
              <span className="inline-flex items-center rounded-sm border border-slate-700 bg-slate-950 px-2.5 py-1 text-fluid-micro font-medium text-slate-300">
                4-Tier Hybrid Pipeline
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-5xl">
              Whether Programmatic Graphics System
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
              A unified visual language engine combining <strong>Generator Utilities</strong>, <strong>SVG Vector Precision</strong>, <strong>Inline SVG Filter Shaders</strong>, and <strong>Hardware-Accelerated WebGL Fragment Shaders</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/mockups"
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wider"
            >
              ← Back to Mockups Lab
            </Link>
          </div>
        </div>
      </section>

      {/* Layer Comparisons Grid */}
      <section className="mt-8 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Layers className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-white">4-Tier Pipeline Layer Comparison</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Tier 1: Pure SVG Vector */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-center">
            <ParametricGraphic seed={seed} mode={mode} renderingTier="svg" size={120} stateValue={metric} />
            <div className="space-y-1">
              <span className="inline-block rounded-sm bg-slate-800 px-2.5 py-0.5 text-fluid-micro font-semibold text-cyan-300">
                Layer 1: SVG Geometry
              </span>
              <p className="text-xs text-slate-300 font-semibold">Deterministic SSR Precision</p>
              <p className="text-fluid-micro text-slate-400">Zero layout shift, 100% vector scaling fallback</p>
            </div>
          </div>

          {/* Tier 2: Inline SVG Filter Shaders */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-center">
            <ParametricGraphic seed={seed} mode={mode} renderingTier="filter" size={120} stateValue={metric} />
            <div className="space-y-1">
              <span className="inline-block rounded-sm bg-indigo-950 px-2.5 py-0.5 text-fluid-micro font-semibold text-indigo-300">
                Layer 2: SVG Filter Shader
              </span>
              <p className="text-xs text-slate-300 font-semibold">feTurbulence &amp; Displacement</p>
              <p className="text-fluid-micro text-slate-400">Browser-native GPU-like distortion without canvas</p>
            </div>
          </div>

          {/* Tier 3: GPU WebGL Shaders */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-center">
            <ParametricGraphic seed={seed} mode={mode} renderingTier="webgl" size={120} stateValue={metric} />
            <div className="space-y-1">
              <span className="inline-block rounded-sm bg-emerald-950 px-2.5 py-0.5 text-fluid-micro font-semibold text-emerald-300">
                Layer 3: WebGL GLSL Shader
              </span>
              <p className="text-xs text-slate-300 font-semibold">Hardware Accelerated Noise</p>
              <p className="text-fluid-micro text-slate-400">Fluid domain warping &amp; holographic shimmers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Controls & Live Playground */}
      <section className="weather-panel mt-12 space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-10 backdrop-blur-xl">
        <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Visual Language Controls &amp; Token Matrix</h2>
          </div>
          <button
            onClick={() => setSeed(`seed-${Math.random().toString(36).substring(2, 10)}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Randomize Seed
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center shadow-inner">
            <ParametricGraphic seed={seed} mode={mode} renderingTier={tier} size={size} stateValue={metric} />
            <div className="mt-4 space-y-1">
              <p className="font-mono text-xs text-slate-400">HASH: {matrix.hashHex.slice(0, 16)}...</p>
              <p className="text-fluid-micro text-slate-400">Current Tier: {tier.toUpperCase()}</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Input Seed String
              </label>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Shader Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as ShaderMode)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="reportSeal">Report Seal</option>
                  <option value="signalVolatility">Signal Volatility</option>
                  <option value="dataProvenance">Data Provenance</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Rendering Tier
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="auto">Auto (Smart)</option>
                  <option value="svg">SVG Vector</option>
                  <option value="filter">SVG Filter</option>
                  <option value="webgl">WebGL GPU</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Size ({size}px)
                </label>
                <input
                  type="range"
                  min="64"
                  max="220"
                  step="12"
                  value={size}
                  onChange={(e) => setSize(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 mt-2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="font-semibold uppercase tracking-wider">State Volatility Metric</span>
                <span>{(metric * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={metric}
                onChange={(e) => setMetric(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
