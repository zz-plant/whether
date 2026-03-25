import Link from "next/link";
import type { Route } from "../../../../lib/navigation/routeType";
import type { HomePageWorkspaceModel } from "../../../../lib/report/homePageAssembler";
import { BoltIcon, CheckIcon, DocumentIcon, ShieldIcon } from "../../uiIcons";
import { CardEyebrow, HomeBandHeader } from "./primitives";

export function OperationsBandSection({ workspaceModel }: { workspaceModel: HomePageWorkspaceModel }) {
  return (
    <section id="approve-this-weeks-plan" className="home-band home-band--operations home-band-shell weather-panel weather-section-stage weather-section-stage--medium scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="approve-this-weeks-plan-title">
      <HomeBandHeader
        step="02"
        kicker="Execution guardrails"
        title="Lock the operating summary here, then open Operations only for execution detail."
        description="This band compresses the weekly do now, top guardrails, finance posture, and share handoff after you review the call."
        icon={<CheckIcon className="h-5 w-5 text-emerald-100" />}
        toneClass="border-emerald-400/40 text-emerald-200"
        actions={<Link href={workspaceModel.operations.continueHref as Route} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em]"><CheckIcon className="h-3.5 w-3.5" /><span>Continue in Operations</span></Link>}
      />
      <div className="weather-list-stagger grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <article className="home-band-card home-band-card--priority weather-surface weather-delta-card rounded-xl p-3" data-emphasis="true">
          <CardEyebrow icon={<BoltIcon className="h-3.5 w-3.5" />} label="Weekly operating action" accentClass="text-emerald-200" />
          <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.operations.approvalHeadline}</p>
          <p className="mt-2 text-sm text-slate-300">{workspaceModel.operations.approvalDetail}</p>
        </article>
        <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
          <CardEyebrow icon={<ShieldIcon className="h-3.5 w-3.5" />} label="Hold this line" accentClass="text-amber-200" />
          <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.operations.topGuardrails[0]?.label ?? "Guardrails"}</p>
          <p className="mt-2 text-sm text-slate-300">{workspaceModel.operations.topGuardrails[0]?.detail ?? "Keep this week's guardrails in force until a flip condition clears."}</p>
        </article>
      </div>
      <div className="flex flex-wrap gap-2">
        {workspaceModel.operations.exportActions.map((action) => (
          <Link key={action.href} href={action.href as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
            <DocumentIcon className="h-3.5 w-3.5" />
            <span>{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
