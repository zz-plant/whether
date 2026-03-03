"use client";

import { useClipboardCopy } from "../../components/useClipboardCopy";

type CopyAnchorButtonProps = {
  anchor: string;
};

export function CopyAnchorButton({ anchor }: CopyAnchorButtonProps) {
  const { copyToClipboard, copiedTarget } = useClipboardCopy();

  return (
    <button
      type="button"
      onClick={() => copyToClipboard(`${window.location.origin}${window.location.pathname}#${anchor}`, anchor)}
      className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100"
      aria-label={`Copy link to ${anchor}`}
    >
      {copiedTarget === anchor ? "Copied" : "Copy section"}
    </button>
  );
}
