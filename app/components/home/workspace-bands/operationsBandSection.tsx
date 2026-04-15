import Link from "next/link";
import type { Route } from "../../../../lib/navigation/routeType";
import type { HomePageWorkspaceModel } from "../../../../lib/report/homePageAssembler";
import { BoltIcon, CheckIcon, DocumentIcon, ShieldIcon } from "../../uiIcons";
import { CardEyebrow, HomeBandHeader } from "./primitives";

const ownerLabelByKey: Record<string, string> = {
  "investment-pace": "CFO",
  "risk-tolerance": "CEO / Finance",
  hiring: "CEO",
  "product-tempo": "CPO",
  "capital-raising": "CEO / Finance",
  "burn-discipline": "CFO",
  "expansion-bets": "CEO",
};

export function OperationsBandSection({ workspaceModel }: { workspaceModel: HomePageWorkspaceModel }) {
  const financeSnapshot = workspaceModel.operations.financeSnapshot[0];
  const reopenItems = workspaceModel.operations.financeSnapshot.slice(0, 2);

  return (
    <section id="approve-this-weeks-plan" className="home-band home-band--operations home-band-shell weather-panel weather-section-stage weather-section-stage--medium scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="approve-this-weeks-plan-title">
      <HomeBandHeader
        step="01"
        kicker="Planning"
        title="What to approve this week"
        icon={<CheckIcon className="h-5 w-5 text-emerald-100" />}
        toneClass="border-emerald-400/40 text-emerald-200"
        actions={<Link href={workspaceModel.operations.continueHref as Route} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em]"><CheckIcon className="h-3.5 w-3.5" /><span>Planning</span></Link>}
      />
      <article className="rounded-xl border border-slate-800/80 bg-slate-950/55 p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardEyebrow icon={<BoltIcon className="h-3.5 w-3.5" />} label="Weekly decision" accentClass="text-emerald-200" />
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
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Approve now</p>
              <span className="rounded-[0.65rem] border border-emerald-400/25 bg-slate-950/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-100">
                Approve now
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <article className="rounded-lg border border-emerald-400/20 bg-slate-950/45 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-100">Weekly direction</p>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-slate-400">Owner leadership</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-300">{workspaceModel.operations.approvalHeadline}</p>
              </article>
              {financeSnapshot ? (
                <article className="rounded-lg border border-emerald-400/20 bg-slate-950/45 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-100">{financeSnapshot.label}</p>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-slate-400">
                      Owner {ownerLabelByKey[financeSnapshot.key] ?? "Finance"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{financeSnapshot.actionNow}</p>
                </article>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-amber-400/20 bg-amber-500/8 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">Pause pace if</p>
              <span className="rounded-[0.65rem] border border-amber-400/25 bg-slate-950/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-100">
                Stop line
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {workspaceModel.operations.topGuardrails.slice(0, 3).map((guardrail) => (
                <article key={guardrail.key} className="rounded-lg border border-amber-400/20 bg-slate-950/45 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-100">{guardrail.label}</p>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-slate-400">
                      Owner {ownerLabelByKey[guardrail.key] ?? "Operator"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{guardrail.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-sky-400/20 bg-sky-500/8 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">Reopen if</p>
              <span className="rounded-[0.65rem] border border-sky-400/25 bg-slate-950/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-100">
                Recheck
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {reopenItems.length > 0 ? reopenItems.map((item) => (
                <article key={item.key} className="rounded-lg border border-sky-400/20 bg-slate-950/45 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-100">{item.label}</p>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-slate-400">
                      Owner {ownerLabelByKey[item.key] ?? "Leadership"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{item.reversalCondition}</p>
                </article>
              )) : (
                <article className="rounded-lg border border-sky-400/20 bg-slate-950/45 px-2.5 py-2">
                  <p className="text-xs font-semibold text-slate-100">Planning reset</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">Move faster again once the current stop line clears and next week&apos;s update confirms it.</p>
                </article>
              )}
            </div>
          </section>
        </div>
      </article>

      <div className="weather-list-stagger grid gap-4 lg:grid-cols-2">
        <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
          <CardEyebrow icon={<ShieldIcon className="h-3.5 w-3.5" />} label="Main hold line" accentClass="text-amber-200" />
          <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.operations.topGuardrails[0]?.label ?? "Current limit"}</p>
          <p className="mt-2 text-sm text-slate-300">{workspaceModel.operations.topGuardrails[0]?.detail ?? "Keep this limit in place until the signal blocking it clears."}</p>
        </article>
        <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
          <CardEyebrow icon={<DocumentIcon className="h-3.5 w-3.5" />} label={financeSnapshot ? "Finance implication" : "Meeting-ready brief"} accentClass="text-slate-200" />
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {financeSnapshot ? financeSnapshot.label : "Meeting-ready brief once planning is complete."}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {financeSnapshot ? financeSnapshot.actionNow : "The approved brief is what you carry into the meeting."}
          </p>
        </article>
      </div>
    </section>
  );
}
