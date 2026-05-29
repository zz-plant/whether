"use client";

import { Copy, CopyCheck } from "lucide-react";
import { Toast } from "@base-ui/react/toast";
import { useClipboardCopy } from "../../components/useClipboardCopy";
import { DIRECTION_ARROW, DIRECTION_LABEL, DIRECTION_ACCENT, type SignalDirection } from "../viewModel";

type ActionCardProps = {
  call: string;
  actionNow?: string;
  guardrail?: string;
  flipConditions?: string[];
  tightness: number;
  direction: SignalDirection;
  recordDate?: string;
  pauseThreshold?: number;
};

export function ActionCard({
  call,
  actionNow,
  guardrail,
  flipConditions,
  tightness,
  direction,
  recordDate,
  pauseThreshold = 80,
}: ActionCardProps) {
  const { status, copyToClipboard } = useClipboardCopy();
  const { add } = Toast.useToastManager();
  const isCopied = status === "copied";
  const arrow = DIRECTION_ARROW[direction];

  const buildText = () => [
    `Whether · Weekly Brief · ${recordDate ?? ""}`,
    "",
    `${arrow} ${call}`,
    actionNow ? `Do now: ${actionNow}` : null,
    guardrail ? `Threshold: ${guardrail} (tightness ${tightness}/${pauseThreshold})` : null,
    flipConditions?.length ? `Watching: ${flipConditions.join(" · ")}` : null,
    "",
    "whether.work",
  ].filter(Boolean).join("\n");

  const handleCopy = async () => {
    const success = await copyToClipboard(buildText(), "Weekly brief");
    if (success) {
      add({
        title: "Brief copied",
        description: "Weekly operating brief copied to clipboard.",
        type: "success",
      });
    }
  };

  const pauseColor = tightness >= pauseThreshold ? "bg-rose-500" : tightness >= pauseThreshold - 5 ? "bg-amber-500" : "bg-emerald-500";

  return (
      <div className={`weather-surface rounded-xl px-5 py-5 border-t-2 ${DIRECTION_ACCENT[direction]} border-white/[0.06]`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs font-semibold tracking-[0.06em] text-slate-500">
          {DIRECTION_LABEL[direction]}
        </p>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-4 py-2 text-xs font-medium text-white/60 hover:text-white/80 hover:border-white/[0.14] transition-colors active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-sky-400"
          aria-label={isCopied ? "Copied to clipboard" : "Copy brief to clipboard"}
        >
          {isCopied ? (
            <>            <CopyCheck className="w-3.5 h-3.5" aria-hidden="true" /> Copied</>
          ) : (
            <>            <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy</>
          )}
        </button>
      </div>

      <h2 className="text-lg font-semibold text-slate-100 mb-4">
        <span className="mr-1.5">{arrow}</span>
        {call}
      </h2>

      <div className="space-y-3 text-sm">
        {actionNow ? (
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center gap-1.5">
              <span aria-hidden="true" className="text-white/20 text-[0.5rem] transition-transform group-open:rotate-90">▸</span>
              <p className="text-[0.6rem] font-semibold tracking-[0.06em] text-white/40">Do now</p>
            </summary>
            <p className="text-slate-200 ml-3.5 mt-1">{actionNow}</p>
          </details>
        ) : null}

        {guardrail ? (
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center gap-1.5">
              <span aria-hidden="true" className="text-white/20 text-[0.5rem] transition-transform group-open:rotate-90">▸</span>
              <p className="text-[0.6rem] font-semibold tracking-[0.06em] text-white/40">Pause if</p>
            </summary>
            <div className="ml-3.5 mt-1">
              <p className="text-white/50 text-xs">{guardrail}</p>
              <div className="mt-2 h-2 w-full rounded-full bg-[var(--bg-nested)] overflow-hidden">
                <div className={`h-full rounded-full ${pauseColor}`} style={{ width: `${Math.min(100, (tightness / pauseThreshold) * 100)}%` }} />
              </div>
              <div className="flex justify-between text-[0.55rem] text-white/30 mt-0.5">
                <span>{tightness}</span>
                <span>{pauseThreshold}</span>
              </div>
            </div>
          </details>
        ) : null}

        {flipConditions?.length ? (
          <details className="group" open>
            <summary className="cursor-pointer list-none flex items-center gap-1.5">
              <span aria-hidden="true" className="text-white/20 text-[0.5rem] transition-transform group-open:rotate-90">▸</span>
              <p className="text-[0.6rem] font-semibold tracking-[0.06em] text-white/40">If conditions shift</p>
            </summary>
            <ul className="space-y-0.5 ml-3.5 mt-1">
              {flipConditions.map((c, i) => (
                <li key={i} className="text-xs text-sky-300">{c}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}
