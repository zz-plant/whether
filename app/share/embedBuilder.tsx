"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { locationHashSource, useBrowserSource, useHydrated } from "../components/browserSource";
import { ClipboardActionRow } from "../components/clipboardActionRow";
import { SegmentedControl } from "../components/ui/segmentedControl";
import { getClipboardUiState, useClipboardCopy } from "../components/useClipboardCopy";
import { OPERATOR_STAGE_OPTIONS } from "../../lib/report/operatorStage";
import { siteUrl } from "../../lib/siteUrl";

/**
 * The embed snippet builder, as a section of `/share`.
 *
 * It was its own route. An embed is the same artifact as everything else on
 * this page in a different container, and a reader arriving to "get the brief
 * out" was offered two doors — /share for text, /embed for a widget — with
 * nothing on either saying the other existed. `/embed` redirects here.
 */
const STAGE_OPTIONS = [
  { value: "", label: "Any stage" },
  ...OPERATOR_STAGE_OPTIONS.map((option) => ({ value: option.key, label: option.label })),
] as const;

const TICKER_PRESETS = [
  { key: "", label: "None" },
  ...["GOOGL", "MSFT", "DOCU", "COIN", "UBER", "AAPL"].map((ticker) => ({ key: ticker, label: ticker })),
] as const;

const EMBED_FORMAT_OPTIONS = [
  { key: "brief", label: "Full brief" },
  { key: "call-strip", label: "One-line strip" },
] as const;

export function EmbedBuilder() {
  const [embedMode, setEmbedMode] = useState<"brief" | "call-strip">("brief");
  const [ticker, setTicker] = useState("");
  const [stage, setStage] = useState("");
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy({ commitment: "copied_brief" });
  /* Remounts the preview whenever the snippet's attributes change, so embed.js
     hydrates it again. This was a counter bumped from an effect on every change
     to either field — a second render to reach a value both fields already
     determine. The key is those fields. */
  const previewKey = `${embedMode}|${ticker}|${stage}`;

  /* The origin is resolved, not written in: this snippet is the thing a reader
     copies into somebody else's page, and on the preview lane a literal made it
     advertise production — so the preview of the embed could never be a preview
     of the embed. `app/api-docs/page.tsx` already builds this with `siteUrl`. */
  const embedCode = `<div data-whether-embed="${embedMode}"${
    ticker ? ` data-whether-ticker="${ticker}"` : ""
  }${stage ? ` data-whether-stage="${stage}"` : ""}></div>
<script async src="${siteUrl}/embed.js"></script>`;

  /* The same widget as a whole page, for an editor that embeds by URL (a
     Notion /embed block, Coda, Confluence's iframe macro). */
  const frameParams = new URLSearchParams({ format: "page", ...(embedMode === "call-strip" ? { mode: "call-strip" } : {}), ...(ticker ? { ticker } : {}), ...(stage ? { stage } : {}) });
  const frameUrl = `${siteUrl}/api/embed?${frameParams.toString()}`;
  /* The conditions as a status badge, for a README, a data room, or an investor page. */
  const badgeMarkdown = `[![Startup conditions this week, from Whether](${siteUrl}/api/badge)](${siteUrl}/)`;

  const handleCopy = useCallback(() => {
    void copyToClipboard(embedCode, "embed");
  }, [copyToClipboard, embedCode]);

  /* Folded by default: most readers come to /share to paste, and the builder
     open was the page's tallest section, an empty preview box included. It
     opens for a link that names it — the retired /embed route redirects to
     /share#embed. */
  const openFromLink = useBrowserSource(locationHashSource) === "embed";
  const hydrated = useHydrated();

  return (
    <details className="weather-auto-chevron" open={openFromLink}>
      <summary className="cursor-pointer list-none">
        {/* One block, so the summary's row lays the chevron beside the title
            and its line rather than splitting the two into columns. */}
        <div className="min-w-0 space-y-2">
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Add a live brief to a newsletter, wiki or dashboard
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
            A snippet that shows what to do this week and what would change it, updated weekly.
          </p>
        </div>
      </summary>
      <div className="space-y-4">
        <div className="max-w-xs">
          <SegmentedControl
            options={EMBED_FORMAT_OPTIONS}
            value={embedMode}
            onSelect={(val) => setEmbedMode(val as "brief" | "call-strip")}
            ariaLabel="Embed format"
          />
        </div>

        {/* minmax(0,…) and min-w-0: a grid item defaults to min-width:auto, so
            the embed snippet's <pre> pushed its column to 520px inside a 358px
            grid and the page scrolled sideways on a phone. */}
        {/* The default snippet is what nearly everyone pastes. Ticker and stage
            used to be asked for before any preview appeared; they are a
            refinement now, after the copy button. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-3">
            <p className="text-fluid-micro font-semibold tracking-[0.04em] text-slate-400">
              Live preview
            </p>
            <div
              key={previewKey}
              data-whether-embed={embedMode}
              {...(ticker ? { "data-whether-ticker": ticker } : {})}
              {...(stage ? { "data-whether-stage": stage } : {})}
              style={{ minHeight: embedMode === "call-strip" ? "38px" : "80px" }}
            >
              {/* Client-side only: the server HTML is what a crawler indexes, and a
                  "Loading…" sentence there is not part of the page. */}
              <div className="px-3 py-3 text-fluid-micro text-slate-400">
                {hydrated ? `Loading the live ${embedMode === "call-strip" ? "call strip" : "brief"}${ticker ? ` for ${ticker}` : ""}${stage ? ` (${stage})` : ""}…` : null}
              </div>
            </div>
          </div>
        <div className="min-w-0 space-y-3">
          <p className="text-fluid-micro font-semibold tracking-[0.04em] text-slate-400">
            Embed code
          </p>

          <pre className="overflow-x-auto rounded-md border border-slate-800/80 bg-slate-950/80 p-3 text-fluid-xs leading-relaxed text-slate-200">
            <code>{embedCode}</code>
          </pre>

          <ClipboardActionRow
            label="Copy code"
            state={getClipboardUiState("embed", { status, error, activeTarget, copiedTarget })}
            onClick={handleCopy}
            buttonClassName="w-full"
            buttonLabels={{ error: "Copy failed" }}
          />

          <p className="text-fluid-micro leading-relaxed text-slate-400">
            Paste this into any HTML newsletter or webpage: the brief renders live, updates every
            week with no API key, and carries a small &ldquo;Macro brief by Whether&rdquo; footer
            linking back here.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <p className="text-fluid-xs font-semibold text-slate-200">Notion, Coda, or a wiki</p>
          <p className="text-fluid-micro leading-relaxed text-slate-400">
            Where scripts are not allowed, paste this address into an embed block. It shows the same widget, with your
            choices above.
          </p>
          <pre className="overflow-x-auto rounded-md border border-[color:var(--border-subtle)] bg-[var(--bg-nested)] p-3 text-fluid-xs text-slate-200">
            <code>{frameUrl}</code>
          </pre>
          <ClipboardActionRow
            label="Copy embed address"
            state={getClipboardUiState("embed-frame", { status, error, activeTarget, copiedTarget })}
            onClick={() => void copyToClipboard(frameUrl, "embed-frame")}
            buttonLabels={{ error: "Copy failed" }}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-fluid-xs font-semibold text-slate-200">Status badge</p>
          <p className="text-fluid-micro leading-relaxed text-slate-400">
            This week&apos;s conditions in one word, for a README, a data room, or an investor page. It changes when
            the conditions do.
          </p>
          {/* The badge as the reader will paste it: the route's own SVG, so
              `unoptimized` (the worker's optimizer reads static assets only). */}
          <Image src="/api/badge" alt="Startup conditions this week, from Whether" width={180} height={20} unoptimized className="h-5 w-auto" />
          <pre className="overflow-x-auto rounded-md border border-[color:var(--border-subtle)] bg-[var(--bg-nested)] p-3 text-fluid-xs text-slate-200">
            <code>{badgeMarkdown}</code>
          </pre>
          <ClipboardActionRow
            label="Copy badge Markdown"
            state={getClipboardUiState("embed-badge", { status, error, activeTarget, copiedTarget })}
            onClick={() => void copyToClipboard(badgeMarkdown, "embed-badge")}
            buttonLabels={{ error: "Copy failed" }}
          />
        </div>
      </div>

      <details className="weather-auto-chevron">
        <summary className="text-fluid-xs font-semibold text-slate-200">
          <span>Customise: ticker and company stage</span>
        </summary>
        <div className="mt-3 max-w-sm space-y-3">
          <div>
            <label htmlFor="embed-ticker" className="block text-fluid-xs font-medium text-slate-300">
              Ticker
            </label>
            <input
              id="embed-ticker"
              type="text"
              placeholder="e.g. DOCU…"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase().slice(0, 10))}
              className="weather-input mt-1 w-full px-3 py-2"
              maxLength={10}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <SegmentedControl
            options={TICKER_PRESETS}
            value={ticker}
            onSelect={setTicker}
            ariaLabel="Ticker presets"
          />

          <div>
            <label htmlFor="embed-stage" className="block text-fluid-xs font-medium text-slate-300">
              Company stage
            </label>
            <select
              id="embed-stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="weather-input mt-1 w-full px-3 py-2"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>
      </div>
    </details>
  );
}
