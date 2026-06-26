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

export default function EmbedPage() {
  const [ticker, setTicker] = useState("");
  const [stage, setStage] = useState("");
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  const embedCode = `<div data-whether-embed="brief"${
    ticker ? ` data-whether-ticker="${ticker}"` : ""
  }${stage ? ` data-whether-stage="${stage}"` : ""}></div>
<script async src="https://whether.work/embed.js"></script>`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  useEffect(() => {
    setPreviewKey((k) => k + 1);
  }, [ticker, stage]);

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-white/90">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-fluid-xs font-semibold tracking-[0.04em] text-sky-300">
            Whether — Embed
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white/90 sm:text-3xl">
            Add a weekly brief to your newsletter
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
            Embed a live US macro brief in any newsletter or webpage. Readers get the current
            operating call, bounded decisions, and flip watch — updated automatically every week.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_14rem]">
          <div className="space-y-5">
            <div className="weather-card">
              <p className="mb-3 text-fluid-micro font-semibold tracking-[0.04em] text-white/60">
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
                <div className="text-fluid-micro text-white/50 py-3 px-3">
                  {ticker || stage
                    ? `Loading brief${ticker ? ` for ${ticker}` : ""}${stage ? ` (${stage})` : ""}…`
                    : "Configure your brief to see a live preview"}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="weather-card">
              <p className="mb-3 text-fluid-micro font-semibold tracking-[0.04em] text-white/60">
                Configure
              </p>

              <div className="space-y-3">
                <div>
                  <label htmlFor="embed-ticker" className="block text-fluid-xs font-medium text-white/60">
                    Ticker
                  </label>
                  <input
                    id="embed-ticker"
                    type="text"
                    placeholder="e.g. DOCU…"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase().slice(0, 10))}
                    className="mt-1 w-full rounded-lg border border-white/[0.10] bg-[var(--bg-nested)] px-2.5 py-1.5 text-xs text-white/80 focus:border-sky-500/50 focus:outline-none"
                    maxLength={10}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {DEFAULT_TICKERS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTicker(t)}
                      className={`rounded-md px-2 py-0.5 text-fluid-micro font-medium transition-colors active:scale-[0.97] ${
                        ticker === t
                          ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40"
                          : "bg-white/[0.06] text-white/60 hover:bg-white/[0.10] hover:text-white/60"
                      }`}
                    >
                      {t || "None"}
                    </button>
                  ))}
                </div>

                <div>
                  <label htmlFor="embed-stage" className="block text-fluid-xs font-medium text-white/60">
                    Company stage
                  </label>
                  <select
                    id="embed-stage"
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/[0.10] bg-[var(--bg-nested)] px-2.5 py-1.5 text-xs text-white/80 focus:border-sky-500/50 focus:outline-none"
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

            <div className="weather-card">
              <p className="mb-3 text-fluid-micro font-semibold tracking-[0.04em] text-white/60">
                Embed code
              </p>

              <pre className="overflow-x-auto rounded-lg border border-white/[0.10] bg-[var(--bg-nested)] p-3 text-fluid-xs leading-relaxed text-white/60">
                <code>{embedCode}</code>
              </pre>

              <div className="mt-3">
                <button
                  onClick={handleCopy}
                  className={`w-full rounded-lg px-3 py-2 text-fluid-xs font-semibold tracking-[0.04em] transition-colors active:scale-[0.97] ${
                    copied
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                      : "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 hover:text-sky-200 ring-1 ring-sky-500/30"
                  }`}
                >
                  {copied ? "Copied" : "Copy code"}
                </button>
              </div>

              <p className="mt-3 text-fluid-micro leading-relaxed text-white/60">
                Paste this into any HTML newsletter or webpage. The brief renders live and
                auto-updates weekly. No API key needed.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/[0.04] pt-10">
          <h2 className="mb-5 text-lg font-semibold text-white/70">How it works</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { step: "Configure", desc: "Pick a ticker and company stage that fits your audience." },
              { step: "Copy", desc: "Paste the snippet into your newsletter HTML or website. No API key needed." },
              { step: "Publish", desc: "The brief updates automatically every week. Fresh posture, zero maintenance." },
            ].map((item) => (
              <div key={item.step} className="weather-card">
                <p className="text-fluid-xs font-semibold tracking-[0.04em] text-sky-300">{item.step}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 weather-card">
          <p className="text-fluid-xs leading-relaxed text-white/60">
            <strong className="text-white/60">Attribution:</strong> The embed block includes a small
            &ldquo;Macro brief by Whether&rdquo; footer with a link back to whether.work.
            This attribution is required for free embed usage.
          </p>
        </div>
      </div>
    </main>
  );
}
