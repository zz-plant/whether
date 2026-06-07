"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Image as ImageIcon, Loader2, Check, AlertTriangle } from "lucide-react";
import { buildImageBriefApiPath } from "../../lib/report/imageBriefSearchParams";

type ExportImageButtonProps = {
  decision?: string;
  regime?: string;
  tightness?: number;
  riskAppetite?: number;
  confidenceLabel?: string;
};

type ButtonState = "idle" | "loading" | "success" | "error";

export function ExportImageButton(_props: ExportImageButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const currentSearchParams = useSearchParams();
  const imageBriefHref = useMemo(
    () => buildImageBriefApiPath(currentSearchParams),
    [currentSearchParams],
  );

  const handleCopy = useCallback(async () => {
    setState("loading");
    setDownloadUrl(null);

    try {
      const response = await fetch(imageBriefHref);

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const blob = await response.blob();

      try {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        setState("success");
      } catch (_clipboardError) {
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setState("error");
      }
    } catch (_fetchError) {
      setState("error");
    }
  }, [imageBriefHref]);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        disabled={state === "loading"}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state === "idle" && (
          <>
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Copy as image</span>
          </>
        )}
        {state === "loading" && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Generating…</span>
          </>
        )}
        {state === "success" && (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-300" />
            <span className="text-emerald-300">Copied!</span>
          </>
        )}
        {state === "error" && (
          <>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-amber-300">Try downloading instead</span>
          </>
        )}
      </button>
      {state === "error" && downloadUrl && (
        <a
          href={downloadUrl}
          download="whether-weekly-brief.png"
          className="text-xs text-sky-300 underline hover:text-sky-100"
        >
          Download PNG
        </a>
      )}
    </span>
  );
}
