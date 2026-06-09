"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, ImageIcon } from "lucide-react";
import { useClipboardCopy } from "../../components/useClipboardCopy";
import { buildImageBriefApiPath } from "../../../lib/report/imageBriefSearchParams";

type Props = {
  call: string;
  arrow: string;
  boldnessScore: number;
  boldnessDelta: number;
  guardrail?: string;
};

export function StickyCallStrip({ call, arrow, boldnessScore, boldnessDelta, guardrail }: Props) {
  const { status, copyToClipboard } = useClipboardCopy();
  const isCopied = status === "copied";
  const currentSearchParams = useSearchParams();
  const imageBriefHref = useMemo(
    () => buildImageBriefApiPath(currentSearchParams),
    [currentSearchParams],
  );

  const deltaLabel = boldnessDelta !== 0
    ? `${boldnessDelta > 0 ? "+" : ""}${boldnessDelta.toFixed(0)} vs last week`
    : "unchanged";
  const deltaColor = boldnessDelta > 0 ? "text-emerald-300" : boldnessDelta < 0 ? "text-rose-300" : "text-white/45";

  const handleCopy = async () => {
    const text = [
      `Whether · Boldness Budget ${boldnessScore}/100 (${deltaLabel})`,
      `${arrow} ${call}`,
      guardrail ? `Bounded condition: ${guardrail}` : null,
      "whether.work",
    ].filter(Boolean).join(" — ");
    await copyToClipboard(text, "Weekly call");
  };

  return (
    <div className="lg:hidden sticky bottom-0 z-40 -mx-4 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1.5 bg-gradient-to-t from-[var(--bg-body)] via-[var(--bg-body)]/88 to-transparent">
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[var(--bg-raised)]/94 px-3 py-2 shadow-[0_-4px_16px_rgba(0,0,0,0.26)] backdrop-blur">
        <span className="min-w-0 flex-1 text-fluid-xs font-semibold leading-snug text-white/85">
          <span className="mr-1.5">{arrow}</span>
          <span className="text-white/45">{boldnessScore}/100</span>{" "}
          <span className="block truncate">{call}</span>
        </span>
        <span className={`hidden text-fluid-xs font-semibold ${deltaColor} flex-shrink-0 min-[430px]:inline`}>{deltaLabel}</span>
        <a
          href={imageBriefHref}
          download="whether-brief.png"
          className="flex-shrink-0 inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-white/[0.08] text-fluid-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] transition-colors active:scale-[0.97] no-underline focus-visible:outline-2 focus-visible:outline-sky-400"
          aria-label="Download decision card image"
        >
          <ImageIcon className="w-3 h-3" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/[0.08] px-3 text-fluid-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] transition-colors active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-sky-400"
          aria-label={isCopied ? "Copied weekly call" : "Copy weekly call"}
        >
          {isCopied ? (
            "Copied"
          ) : (
            <><Copy className="w-3 h-3" aria-hidden="true" /> Copy</>
          )}
        </button>
      </div>
    </div>
  );
}
