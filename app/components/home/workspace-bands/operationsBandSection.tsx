import Link from "next/link";
import type { Route } from "../../../../lib/navigation/routeType";
import type { HomePageWorkspaceModel } from "../../../../lib/report/homePageAssembler";
import { BoltIcon, CheckIcon, DocumentIcon, ShieldIcon } from "../../uiIcons";
import { CardEyebrow, HomeBandHeader } from "./primitives";

export function OperationsBandSection({ workspaceModel }: { workspaceModel: HomePageWorkspaceModel }) {
  const financeSnapshot = workspaceModel.operations.financeSnapshot[0];

  return (
    <section id="approve-this-weeks-plan" className="home-band home-band--operations home-band-shell weather-panel weather-section-stage weather-section-stage--medium scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="approve-this-weeks-plan-title">
      <HomeBandHeader
        step="02"
        kicker="Planning"
        title="Commit the weekly plan here, then open Planning for approval detail."
        description="Weekly Brief should only carry the operating summary. Planning owns guardrails, finance posture, and the final aligned brief."
        icon={<CheckIcon className="h-5 w-5 text-emerald-100" />}
        toneClass="border-emerald-400/40 text-emerald-200"
        actions={<Link href={workspaceModel.operations.continueHref as Route} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em]"><CheckIcon className="h-3.5 w-3.5" /><span>Open Planning</span></Link>}
      />
      <div className="weather-list-stagger grid gap-4 lg:grid-cols-3">
        <article className="home-band-card home-band-card--priority weather-surface weather-delta-card rounded-xl p-3" data-emphasis="true">
          <CardEyebrow icon={<BoltIcon className="h-3.5 w-3.5" />} label="Commit now" accentClass="text-emerald-200" />
          <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.operations.approvalHeadline}</p>
          <p className="mt-2 text-sm text-slate-300">{workspaceModel.operations.approvalDetail}</p>
        </article>
        <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
          <CardEyebrow icon={<ShieldIcon className="h-3.5 w-3.5" />} label="Guardrail" accentClass="text-amber-200" />
          <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.operations.topGuardrails[0]?.label ?? "Guardrails"}</p>
          <p className="mt-2 text-sm text-slate-300">{workspaceModel.operations.topGuardrails[0]?.detail ?? "Keep this week's guardrails in force until a flip condition clears."}</p>
        </article>
        <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
          <CardEyebrow icon={<DocumentIcon className="h-3.5 w-3.5" />} label={financeSnapshot ? "Finance posture" : "Final brief"} accentClass="text-slate-200" />
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {financeSnapshot ? financeSnapshot.label : "Share the aligned brief only after planning is complete."}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {financeSnapshot ? financeSnapshot.actionNow : "Planning owns the final execution-ready artifact and operator asks."}
          </p>
          {workspaceModel.operations.exportActions[0] ? (
            <Link href={workspaceModel.operations.exportActions[0].href as Route} className="mt-3 weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
              <DocumentIcon className="h-3.5 w-3.5" />
              <span>{workspaceModel.operations.exportActions[0].label}</span>
            </Link>
          ) : null}
        </article>
      </div>
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3 text-sm text-slate-300">
        If the weekly plan is clear but one owner-specific edge case still is not, stop widening Planning and open <Link href="/decide" className="font-semibold text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-white">Decision Tools</Link>.
      </div>
    </section>
  );
}
