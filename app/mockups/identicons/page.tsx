"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ParametricIdenticon } from "../../components/ParametricIdenticon";
import { deriveIdenticonParams, hslToCss } from "../../../lib/identicon/hashEngine";
import type { ShaderMode } from "../../../lib/identicon/shaderEngine";
import {
  FileCheck2,
  TrendingUp,
  Database,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Share2,
} from "lucide-react";

export default function IdenticonsMockupPage() {
  const [sandboxSeed, setSandboxSeed] = useState("report-snapshot-2026-07-28-canonical");
  const [sandboxUseCase, setSandboxUseCase] = useState<ShaderMode>("reportSeal");
  const [sandboxSize, setSandboxSize] = useState(160);
  const [sandboxStateVal, setSandboxStateVal] = useState(0.85);
  const [copiedCode, setCopiedCode] = useState(false);

  const playgroundParams = deriveIdenticonParams(sandboxSeed);

  // Use Case 1: Weekly Report Snapshot & Export Seals
  const reportSnapshots = [
    { date: "2026-07-28", title: "Tighten Operating Posture", hash: "sha256-a1b2c3d4e5f67890", posture: "Tighten" },
    { date: "2026-07-21", title: "Neutral Operating Posture", hash: "sha256-f9e8d7c6b5a43210", posture: "Neutral" },
    { date: "2026-07-14", title: "Loosen Operating Posture", hash: "sha256-1234567890abcdef", posture: "Loosen" },
  ];

  // Use Case 2: Macro Signals with Dynamic Volatility (stateValue = volatility 0..1)
  const [macroSignals, setMacroSignals] = useState([
    { key: "yield-curve-inversion", name: "10Y/2Y Yield Spread", volatility: 0.9, regime: "Tighten Trigger" },
    { key: "fed-funds-rate", name: "Fed Funds Target Rate", volatility: 0.2, regime: "Stable Hold" },
    { key: "tech-layoffs-index", name: "Tech Layoff Velocity", volatility: 0.75, regime: "Revisit Buffer" },
    { key: "credit-spreads-ig", name: "IG Credit Spreads", volatility: 0.4, regime: "Normal Band" },
  ]);

  // Use Case 3: Ingestion & KV Snapshot Provenance Checks
  const ingestionRuns = [
    { id: "kv-snapshot-run-9821", store: "Cloudflare KV Production", status: "Canonical", hash: "kv-9821-ok" },
    { id: "fallback-snapshot-store", store: "Local Static Fallback", status: "Degraded Probe", hash: "fb-3312-fallback" },
    { id: "materialized-read-model-v2", store: "Trailing 92-Day Model", status: "Materialized", hash: "mat-92d-v2" },
  ];

  const copyReactCode = () => {
    const codeSnippet = `<ParametricIdenticon
  seed="${sandboxSeed}"
  useCase="${sandboxUseCase}"
  size={${sandboxSize}}
  interactive={true}
  stateValue={${sandboxStateVal}}
/>`;
    navigator.clipboard.writeText(codeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <main id="main-content" className="weather-page-shell weather-page-shell-wide min-h-screen pb-16">
      {/* Header Banner */}
      <section className="weather-panel rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6 sm:p-10 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-fluid-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" /> Whether Visual Lab
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-fluid-micro font-medium text-slate-300">
                SVG + GLSL Shader Seals
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-5xl" style={{ fontFamily: "var(--weather-font-display)" }}>
              Whether Parametric Identicons
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Deterministic <strong>SVG vector geometry</strong> &amp; <strong>WebGL fragment shaders</strong> designed specifically for Whether: providing un-fakeable weekly report artifact seals, dynamic macro signal volatility indicators, and data ingestion provenance seals.
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

      {/* Whether Use Case Implementations Grid */}
      <div className="mt-8 space-y-10">
        {/* USE CASE 1: Weekly Brief & Report Snapshot Integrity Seals */}
        <section className="weather-panel space-y-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Use Case 1: Weekly Brief &amp; Export Artifact Seals</h2>
              </div>
              <p className="text-xs text-slate-400">
                Holographic GPU seals derived from snapshot SHA hashes for Slack shares, meeting decks, and history archives.
              </p>
            </div>
            <span className="rounded-full bg-cyan-950 px-3 py-1 text-fluid-micro font-semibold tracking-wider text-cyan-300 border border-cyan-800/50">
              Shader: Report Seal
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {reportSnapshots.map((item) => (
              <div
                key={item.date}
                className="group flex flex-col items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-950/60 p-5 text-center transition hover:border-cyan-500/40"
              >
                <ParametricIdenticon seed={item.hash} useCase="reportSeal" size={112} interactive={true} />
                <div className="w-full space-y-1.5">
                  <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyan-400">
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Brief {item.date}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="font-mono text-fluid-micro text-slate-400">{item.hash}</p>
                </div>
                <button
                  onClick={() => setSandboxSeed(item.hash)}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-fluid-micro font-medium text-slate-300 transition hover:border-cyan-500/50 hover:text-white"
                >
                  Inspect in Sandbox
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* USE CASE 2: Macro Signal Volatility & Regime Indicators */}
        <section className="weather-panel space-y-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Use Case 2: Macro Signal Volatility Indicators</h2>
              </div>
              <p className="text-xs text-slate-400">
                GPU plasma turbulence speed scales with signal velocity (0 = stable hold, 1 = rapid regime shift).
              </p>
            </div>
            <span className="rounded-full bg-indigo-950 px-3 py-1 text-fluid-micro font-semibold tracking-wider text-indigo-300 border border-indigo-800/50">
              Shader: Signal Volatility
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {macroSignals.map((signal, idx) => (
              <div
                key={signal.key}
                className="flex flex-col items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-950/60 p-5 text-center transition hover:border-indigo-500/40"
              >
                <ParametricIdenticon
                  seed={signal.key}
                  useCase="signalVolatility"
                  size={112}
                  stateValue={signal.volatility}
                  interactive={true}
                />
                <div className="w-full space-y-1">
                  <p className="text-sm font-semibold text-white">{signal.name}</p>
                  <p className="text-xs text-indigo-300 font-medium">{signal.regime}</p>
                </div>

                <div className="w-full space-y-1 pt-1">
                  <div className="flex justify-between text-fluid-micro text-slate-400">
                    <span>Stable</span>
                    <span>High Velocity</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={signal.volatility}
                    onChange={(e) => {
                      const next = [...macroSignals];
                      next[idx].volatility = parseFloat(e.target.value);
                      setMacroSignals(next);
                    }}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* USE CASE 3: Ingestion & KV Snapshot Provenance Checks */}
        <section className="weather-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Use Case 3: Ingestion &amp; KV Snapshot Provenance Seals</h2>
            </div>
            <span className="rounded-full bg-emerald-950 px-2.5 py-1 text-fluid-micro font-semibold text-emerald-300 border border-emerald-800/50">
              Shader: Data Matrix
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {ingestionRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 transition hover:border-emerald-500/40"
              >
                <ParametricIdenticon seed={run.hash} useCase="dataProvenance" size={72} interactive={true} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-semibold text-white">{run.store}</p>
                  <p className="font-mono text-fluid-micro text-slate-400">{run.id}</p>
                  <span className="inline-block rounded-full bg-emerald-950/80 px-2 py-0.5 text-fluid-micro font-semibold text-emerald-400 border border-emerald-800/50">
                    {run.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Interactive Live Sandbox */}
      <section className="weather-panel mt-12 space-y-6 rounded-2xl border border-cyan-900/40 bg-slate-900/80 p-6 sm:p-10 backdrop-blur-xl">
        <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Interactive Sandbox &amp; Parameters Inspector</h2>
          </div>
          <button
            onClick={() => setSandboxSeed(`snapshot-${Math.random().toString(36).substring(2, 10)}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Randomize Seed
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center shadow-inner">
            <ParametricIdenticon
              seed={sandboxSeed}
              useCase={sandboxUseCase}
              size={sandboxSize}
              stateValue={sandboxStateVal}
              interactive={true}
            />
            <div className="mt-4 space-y-1">
              <p className="font-mono text-xs text-slate-400">HEX: {playgroundParams.hashHex.slice(0, 16)}...</p>
              <p className="text-fluid-micro text-slate-400">Hover canvas to accelerate GPU shader</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Input Report / Signal Seed String
              </label>
              <input
                type="text"
                value={sandboxSeed}
                onChange={(e) => setSandboxSeed(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none"
                placeholder="Enter snapshot hash, date, or signal key..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Shader Mode
                </label>
                <select
                  value={sandboxUseCase}
                  onChange={(e) => setSandboxUseCase(e.target.value as ShaderMode)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="reportSeal">Report Seal (Weekly Brief Integrity)</option>
                  <option value="signalVolatility">Signal Volatility (Macro Velocity)</option>
                  <option value="dataProvenance">Data Provenance (KV Snapshot Matrix)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Size ({sandboxSize}px)
                </label>
                <input
                  type="range"
                  min="64"
                  max="256"
                  step="16"
                  value={sandboxSize}
                  onChange={(e) => setSandboxSize(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 mt-2"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="mb-3 text-fluid-micro font-semibold uppercase tracking-wider text-cyan-400">
                Derived Parametric Traits
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-slate-400">Symmetry:</span>{" "}
                  <strong className="text-white">{playgroundParams.symmetry}-fold</strong>
                </div>
                <div>
                  <span className="text-slate-400">Polygon:</span>{" "}
                  <strong className="text-white">{playgroundParams.polygonSides}-sided</strong>
                </div>
                <div>
                  <span className="text-slate-400">Rings:</span>{" "}
                  <strong className="text-white">{playgroundParams.innerRingCount}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Rotation:</span>{" "}
                  <strong className="text-white">{playgroundParams.rotationDeg}°</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Hue 1:</span>
                  <span
                    className="h-3 w-3 rounded-full border border-slate-700"
                    style={{ backgroundColor: hslToCss(playgroundParams.hue1, 80, 60) }}
                  />
                  <strong className="text-white">{Math.round(playgroundParams.hue1)}°</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Hue 2:</span>
                  <span
                    className="h-3 w-3 rounded-full border border-slate-700"
                    style={{ backgroundColor: hslToCss(playgroundParams.hue2, 80, 60) }}
                  />
                  <strong className="text-white">{Math.round(playgroundParams.hue2)}°</strong>
                </div>
                <div>
                  <span className="text-slate-400">Frequency:</span>{" "}
                  <strong className="text-white">{playgroundParams.noiseFrequency.toFixed(1)}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Speed:</span>{" "}
                  <strong className="text-white">{playgroundParams.shaderSpeed.toFixed(1)}x</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={copyReactCode}
                className="weather-button-primary inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wider"
              >
                {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedCode ? "Copied React Snippet!" : "Copy React Component Code"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
