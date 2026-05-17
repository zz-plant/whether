"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STAGE_OPTIONS = [
  { value: "", label: "Generic (no ticker)" },
  { value: "seed", label: "Seed" },
  { value: "series-a", label: "Series A" },
  { value: "growth", label: "Growth stage" },
  { value: "public", label: "Public company" },
] as const;

const DEFAULT_TICKERS = ["", "GOOGL", "MSFT", "DOCU", "COIN", "UBER", "AAPL"];

export default function EmbedPlaygroundPage() {
  const [ticker, setTicker] = useState("");
  const [stage, setStage] = useState("");
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  const embedCode = `<div data-whether-embed="brief"${
    ticker ? ` data-whether-ticker="${ticker}"` : ""
  }${stage ? ` data-whether-stage="${stage}"` : ""}></div>
<script async src="https://whether.app/embed.js"></script>`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = embedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [embedCode]);

  // Re-render preview when ticker/stage changes
  useEffect(() => {
    setPreviewKey((k) => k + 1);
  }, [ticker, stage]);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-sky-400">
          Whether — Embed
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Add a weekly brief to your newsletter
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Embed a live US macro brief in any newsletter or webpage. Readers get the current
          operating call, bounded decisions, and flip watch — updated automatically every week.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_12rem]">
        {/* Preview area */}
        <div className="space-y-5">
          <div className="rounded-md border border-slate-800/60 bg-slate-950/50 p-5">
            <p className="mb-3 text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-500">
              Live preview
            </p>
            <div
              key={previewKey}
              ref={previewRef}
              data-whether-embed="brief"
              {...(ticker ? { "data-whether-ticker": ticker } : {})}
              {...(stage ? { "data-whether-stage": stage } : {})}
              style={{ minHeight: "80px" }}
            >
              <div
                style={{
                  padding: "12px",
                  fontSize: "12px",
                  color: "#64748b",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                {ticker || stage
                  ? `Loading brief${ticker ? ` for ${ticker}` : ""}${stage ? ` (${stage})` : ""}...`
                  : "Configure your brief above to see a live preview"}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — config + code */}
        <div className="space-y-5">
          {/* Configuration */}
          <div className="rounded-md border border-slate-800/60 bg-slate-950/50 p-4">
            <p className="mb-3 text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-500">
              Configure
            </p>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="embed-ticker"
                  className="block text-fluid-xs font-medium text-slate-400"
                >
                  Ticker
                </label>
                <input
                  id="embed-ticker"
                  type="text"
                  placeholder="e.g. DOCU"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase().slice(0, 10))}
                  className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-400/60 focus:outline-none"
                  maxLength={10}
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {DEFAULT_TICKERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTicker(t)}
                    className={`rounded-md px-2 py-0.5 text-fluid-micro font-medium transition-colors ${
                      ticker === t
                        ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40"
                        : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300"
                    }`}
                  >
                    {t || "None"}
                  </button>
                ))}
              </div>

              <div>
                <label
                  htmlFor="embed-stage"
                  className="block text-fluid-xs font-medium text-slate-400"
                >
                  Company stage
                </label>
                <select
                  id="embed-stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-400/60 focus:outline-none"
                >
                  {STAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Embed code */}
          <div className="rounded-md border border-slate-800/60 bg-slate-950/50 p-4">
            <p className="mb-3 text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-500">
              Embed code
            </p>

            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-900/80 p-3 text-fluid-xs leading-relaxed text-slate-300">
                <code>{embedCode}</code>
              </pre>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={`flex-1 rounded-lg px-3 py-2 text-fluid-xs font-semibold uppercase tracking-[0.08em] transition-all ${
                  copied
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                    : "bg-sky-500/20 text-sky-300 hover:bg-sky-400/30 hover:text-sky-200 ring-1 ring-sky-500/30 hover:ring-sky-400/50"
                }`}
              >
                {copied ? "Copied!" : "Copy code"}
              </button>
            </div>

            <p className="mt-3 text-fluid-micro leading-relaxed text-slate-500">
              Paste this into any HTML newsletter or webpage. The brief renders live and
              auto-updates weekly. No API key needed.
            </p>
          </div>
        </div>
      </div>

      {/* How it works section */}
      <div className="mt-14 border-t border-slate-800/40 pt-10">
        <h2 className="mb-5 text-lg font-semibold text-slate-200">How embedding works</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-md border border-slate-800/60 bg-slate-950/40 p-4">
            <p className="text-fluid-xs font-semibold uppercase tracking-[0.08em] text-sky-400">
              1. Configure
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Pick a ticker (or leave blank for a generic US macro brief) and choose the
              company stage that fits your audience.
            </p>
          </div>
          <div className="rounded-md border border-slate-800/60 bg-slate-950/40 p-4">
            <p className="text-fluid-xs font-semibold uppercase tracking-[0.08em] text-sky-400">
              2. Copy
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Paste the embed snippet into your newsletter HTML or website. No API key,
              no signup, no ongoing maintenance.
            </p>
          </div>
          <div className="rounded-md border border-slate-800/60 bg-slate-950/40 p-4">
            <p className="text-fluid-xs font-semibold uppercase tracking-[0.08em] text-sky-400">
              3. Publish
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              The brief renders inline and updates automatically every week. Your readers
              get fresh operating posture without you lifting a finger.
            </p>
          </div>
        </div>
      </div>

      {/* Attribution note */}
      <div className="mt-10 rounded-md border border-slate-800/40 bg-slate-950/30 p-4">
        <p className="text-fluid-xs leading-relaxed text-slate-500">
          <strong className="text-slate-400">Attribution:</strong> The embed block includes
          a small &ldquo;Macro brief by Whether&rdquo; footer with a link back to whether.app.
          This attribution is required for free embed usage.
        </p>
      </div>
    </main>
  );
}