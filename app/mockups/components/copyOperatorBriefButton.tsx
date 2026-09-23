"use client";

import { Copy, CopyCheck } from "lucide-react";
import { useClipboardCopy } from "../../components/useClipboardCopy";

export function CopyOperatorBriefButton({ text }: { text: string }) {
  const { status, copyToClipboard } = useClipboardCopy();
  const isCopied = status === "copied";

  return (
    <button
      type="button"
      onClick={() => void copyToClipboard(text, "operator-brief")}
      className="weather-pill inline-flex min-h-[46px] items-center justify-center gap-2 rounded px-4 py-3 text-sm font-semibold text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-400"
    >
      {isCopied ? (
        <CopyCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      {isCopied ? "Operator brief copied" : "Copy operator brief"}
    </button>
  );
}
