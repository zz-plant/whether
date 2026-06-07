"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Image } from "lucide-react";
import { useClipboardCopy } from "../../components/useClipboardCopy";
import { buildImageBriefApiPath } from "../../../lib/report/imageBriefSearchParams";

type Props = {
  call: string;
  arrow: string;
  tightnessDelta?: number;
};

export function StickyCallStrip({ call, arrow, tightnessDelta }: Props) {
  const { status, copyToClipboard } = useClipboardCopy();
  const isCopied = status === "copied";
  const currentSearchParams = useSearchParams();
  const imageBriefHref = useMemo(
    () => buildImageBriefApiPath(currentSearchParams),
    [currentSearchParams],
  );

  const deltaLabel = tightnessDelta != null && tightnessDelta !== 0
    ? `${tightnessDelta > 0 ? "+" : ""}${tightnessDelta.toFixed(1)} pts`
    : "unchanged";
  const deltaColor = tightnessDelta != null && tightnessDelta > 0 ? "text-rose-300" : tightnessDelta != null && tightnessDelta < 0 ? "text-emerald-300" : "";

  const handleCopy = async () => {
    const text = tightnessDelta != null
      ? `Whether · ${arrow} ${call} (${deltaLabel}) — whether.work`
      : `Whether · ${arrow} ${call} — whether.work`;
    await copyToClipboard(text, "Weekly call");
  };

  return (
    <div className="lg:hidden sticky bottom-0 z-40 -mx-4 px-4 pb-4 pt-2 bg-gradient-to-t from-[var(--bg-body)] via-[var(--bg-body)]/95 to-transparent">
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[var(--bg-raised)] px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
        <span className="text-sm font-semibold text-white/90 flex-1 min-w-0">
          <span className="mr-1.5">{arrow}</span>
          {call}
        </span>
        {tightnessDelta != null && tightnessDelta !== 0 ? (
          <span className={`text-fluid-xs font-semibold ${deltaColor} flex-shrink-0`}>{deltaLabel}</span>
        ) : null}
        <a
          href={imageBriefHref}
          download="whether-brief.png"
          className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1.5 text-fluid-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] transition-colors active:scale-[0.97] no-underline"
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image className="w-3 h-3" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1.5 text-fluid-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] transition-colors active:scale-[0.97]"
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
