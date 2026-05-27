"use client";

import { Copy, CopyCheck } from "lucide-react";
import { useClipboardCopy } from "../../components/useClipboardCopy";

type ActionCardProps = {
  call: string;
  actionNow?: string;
  guardrail?: string;
  flipConditions?: string[];
  tightness: number;
  direction: "tighten" | "ease" | "hold";
  recordDate?: string;
  pauseThreshold?: number;
};

const DIRECTION_ARROW = { tighten: "↑", ease: "↓", hold: "→" } as const;
const DIRECTION_LABEL = { tighten: "Tighten", ease: "Ease", hold: "Hold" } as const;
const DIRECTION_ACCENT = {
  tighten: "border-t-rose-400/30",
  ease: "border-t-emerald-400/30",
  hold: "border-t-sky-400/30",
} as const;

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
    await copyToClipboard(buildText(), "Weekly brief");
  };

  const pauseColor = tightness >= pauseThreshold ? "bg-rose-500" : tightness >= pauseThreshold - 5 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className={`weather-surface rounded-xl px-5 py-5 border-t-2 ${DIRECTION_ACCENT[direction]}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs font-semibold tracking-[0.06em] text-slate-500">
          {DIRECTION_LABEL[direction]}
        </p>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
        >
          {isCopied ? (
            <><CopyCheck className="w-3.5 h-3.5" /> Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy</>
          )}
        </button>
      </div>

      <p className="text-lg font-semibold text-slate-100 mb-4">
        <span className="mr-1.5">{arrow}</span>
        {call}
      </p>

      <div className="space-y-3 text-sm">
        {actionNow ? (
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.06em] text-slate-600 mb-1">Do now</p>
            <p className="text-slate-200">{actionNow}</p>
          </div>
        ) : null}

        {guardrail ? (
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.06em] text-slate-600 mb-1">Pause if</p>
            <p className="text-slate-300 text-xs">{guardrail}</p>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-800/60 overflow-hidden">
              <div className={`h-full rounded-full ${pauseColor}`} style={{ width: `${Math.min(100, (tightness / pauseThreshold) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-[0.55rem] text-slate-600 mt-0.5">
              <span>{tightness}</span>
              <span>{pauseThreshold}</span>
            </div>
          </div>
        ) : null}

        {flipConditions?.length ? (
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.06em] text-slate-600 mb-1">What would change this</p>
            <ul className="space-y-0.5">
              {flipConditions.map((c, i) => (
                <li key={i} className="text-xs text-sky-300">{c}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
