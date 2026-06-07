"use client";

import { Copy, CopyCheck } from "lucide-react";
import { Toast } from "@base-ui/react/toast";
import { useClipboardCopy } from "../../components/useClipboardCopy";
import { DIRECTION_ARROW, type SignalDirection } from "../viewModel";

type ActionCardProps = {
  call: string;
  actionNow?: string;
  guardrail?: string;
  flipConditions?: string[];
  tightness: number;
  direction: SignalDirection;
  recordDate?: string;
  revisitDecisions: boolean;
  revisitCause?: string;
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
  revisitDecisions,
  revisitCause,
  pauseThreshold = 80,
}: ActionCardProps) {
  const { status, copyToClipboard } = useClipboardCopy();
  const { add } = Toast.useToastManager();
  const isCopied = status === "copied";
  const arrow = DIRECTION_ARROW[direction];
  const tightnessTrigger = Math.max(1, pauseThreshold - tightness);
  const boldnessDrop = Math.max(8, Math.round(tightnessTrigger * 0.6));
  const revisitLabel = revisitDecisions ? "YES — Regime shift detected." : "NO — Hold posture.";
  const guardrailRows = [
    `If tightness rises ${tightnessTrigger} points → Hiring window closes → Boldness budget drops ${boldnessDrop} points`,
    "If curve inverts → Payback tolerance tightens to ≤ 9 months",
  ];

  const buildText = () => [
    `Whether · Weekly Brief · ${recordDate ?? ""}`,
    "",
    `${arrow} ${call}`,
    `Revisit last week’s roadmap/hiring decisions? ${revisitLabel}`,
    actionNow ? `Action: ${actionNow}` : null,
    guardrailRows.join("\n"),
    guardrail ? `Source guardrail: ${guardrail}` : null,
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

  return (
    <section className="weather-surface rounded-2xl border border-white/[0.06] p-5 lg:col-span-8" aria-labelledby="bounded-guardrails-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-fluid-nano font-semibold tracking-[0.16em] text-amber-200/70" id="bounded-guardrails-heading">
            bounded guardrails
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">
            <span className="mr-1.5">{arrow}</span>
            {call}
          </h2>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-4 py-2 text-xs font-medium text-white/60 transition-colors hover:border-white/[0.14] hover:text-white/80 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-sky-400"
          aria-label={isCopied ? "Copied to clipboard" : "Copy brief to clipboard"}
        >
          {isCopied ? (
            <><CopyCheck className="h-3.5 w-3.5" aria-hidden="true" /> Copied</>
          ) : (
            <><Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy</>
          )}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
        <p className="text-fluid-micro font-semibold text-white/45">Revisit last week’s roadmap/hiring decisions?</p>
        <p className="mt-1 text-base font-semibold text-white">{revisitLabel}</p>
        {revisitDecisions && revisitCause ? <p className="mt-1 text-fluid-micro text-white/45">{revisitCause}</p> : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {guardrailRows.map((row) => (
          <p key={row} className="rounded-xl border border-white/[0.06] bg-[var(--bg-nested)] px-3 py-3 text-fluid-micro font-medium leading-relaxed text-slate-200 lg:col-span-2">
            {row}
          </p>
        ))}
        {actionNow ? (
          <p className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-3 text-fluid-micro leading-relaxed text-emerald-100/80 lg:col-span-2">
            Action: {actionNow}
          </p>
        ) : null}
        {flipConditions?.length ? (
          <p className="rounded-xl border border-sky-400/10 bg-sky-400/[0.04] px-3 py-3 text-fluid-micro leading-relaxed text-sky-100/80 lg:col-span-2">
            Reverse: {flipConditions.join(" · ")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
