import Link from "next/link";
import type { Route } from "../../../../lib/navigation/routeType";
import type { HomePageWorkspaceModel } from "../../../../lib/report/homePageAssembler";
import { BoltIcon, CheckIcon, DocumentIcon, ShieldIcon } from "../../uiIcons";
import { CardEyebrow, HomeBandHeader } from "./primitives";

export function OperationsBandSection({ workspaceModel }: { workspaceModel: HomePageWorkspaceModel }) {
  const financeSnapshot = workspaceModel.operations.financeSnapshot[0];
  const reopenItems = workspaceModel.operations.financeSnapshot.slice(0, 2);

  return (
    <section id="approve-this-weeks-plan" className="home-band home-band--operations home-band-shell weather-panel weather-section-stage weather-section-stage--medium scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="approve-this-weeks-plan-title">
      <HomeBandHeader
        step="02"
        kicker="Planning"
        title="Commit the weekly plan here. Open Planning only for approval detail."
        description="Use this section to lock the weekly operating line, hold line, and reopen conditions before you widen the workflow."
        icon={<CheckIcon className="h-5 w-5 text-emerald-100" />}
        toneClass="border-emerald-400/40 text-emerald-200"
        actions={<Link href={workspaceModel.operations.continueHref as Route} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em]"><CheckIcon className="h-3.5 w-3.5" /><span>Open Planning</span></Link>}
      />
      <article className="rounded-2xl border border-slate-800/80 bg-slate-950/55 p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardEyebrow icon={<BoltIcon className="h-3.5 w-3.5" />} label="Weekly operating board" accentClass="text-emerald-200" />
            <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.operations.approvalHeadline}</p>
            <p className="mt-1 text-sm text-slate-300">{workspaceModel.operations.approvalDetail}</p>
          </div>
          {workspaceModel.operations.exportActions[0] ? (
            <Link href={workspaceModel.operations.exportActions[0].href as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
              <DocumentIcon className="h-3.5 w-3.5" />
              <span>{workspaceModel.operations.exportActions[0].label}</span>
            </Link>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <section className="rounded-xl border border-emerald-400/20 bg-emerald-500/8 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Commit now</p>
            <div className="mt-3 space-y-2">
              <article className="rounded-lg border border-emerald-400/20 bg-slate-950/45 px-2.5 py-2">
                <p className="text-xs font-semibold text-slate-100">Weekly call</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">{workspaceModel.operations.approvalHeadline}</p>
              </article>
              {financeSnapshot ? (
                <article className="rounded-lg border border-emerald-400/20 bg-slate-950/45 px-2.5 py-2">
                  <p className="text-xs font-semibold text-slate-100">{financeSnapshot.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{financeSnapshot.actionNow}</p>
                </article>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-amber-400/20 bg-amber-500/8 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">Hold line</p>
            <div className="mt-3 space-y-2">
              {workspaceModel.operations.topGuardrails.slice(0, 3).map((guardrail) => (
                <article key={guardrail.key} className="rounded-lg border border-amber-400/20 bg-slate-950/45 px-2.5 py-2">
                  <p className="text-xs font-semibold text-slate-100">{guardrail.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{guardrail.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-sky-400/20 bg-sky-500/8 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">Reopen when</p>
            <div className="mt-3 space-y-2">
              {reopenItems.length > 0 ? reopenItems.map((item) => (
                <article key={item.key} className="rounded-lg border border-sky-400/20 bg-slate-950/45 px-2.5 py-2">
                  <p className="text-xs font-semibold text-slate-100">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{item.reversalCondition}</p>
                </article>
              )) : (
                <article className="rounded-lg border border-sky-400/20 bg-slate-950/45 px-2.5 py-2">
                  <p className="text-xs font-semibold text-slate-100">Final brief</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">Reopen full-speed planning only after the current hold lines clear and the next weekly read confirms.</p>
                </article>
              )}
            </div>
          </section>
        </div>
      </article>

      <div className="weather-list-stagger grid gap-4 lg:grid-cols-2">
        <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
          <CardEyebrow icon={<ShieldIcon className="h-3.5 w-3.5" />} label="Guardrail owner" accentClass="text-amber-200" />
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
        </article>
      </div>
      <div className="rounded-xl border border-amber-400/20 bg-amber-500/8 px-3 py-3 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">Need more detail?</p>
        <p className="mt-2">
          Stay in Planning for approvals and guardrails. Open <Link href="/decide" className="font-semibold text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-white">Decision Tools</Link> only if one owner-specific question is still unresolved.
        </p>
      </div>
    </section>
  );
}
