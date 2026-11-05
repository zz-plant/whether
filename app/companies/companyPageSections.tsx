import { ActionLink } from "../components/ui/actionLink";
import { COMPANIES, COMPANY_ROLES, type CompanyEntry, type CompanyRole } from "../../lib/companies/companyRegistry";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import {
  decisionAreaLabel,
  formatBoundedDecisionAction,
  formatBoundedDecisionReverse,
  formatBoundedDecisionThreshold,
  type BoundedDecisionRule,
} from "../../lib/report/boundedDecisionRules";
import type { CompanySituation } from "../../lib/report/companySituation";
import { publicDecisionLabels } from "../../lib/report/reportFormatting";

export type WeekConditions = {
  /** The weather word: Sunny, Cloudy, Stormy, Freezing. */
  label: string;
  rationale: string;
  guidance: string;
  recordDateLabel: string;
};

const panel = "weather-panel space-y-3 px-6 max-sm:px-0 py-6";

export function ConditionsSection({ conditions }: { conditions: WeekConditions }) {
  return (
    <section className={panel}>
      <h2 className="text-lg font-semibold text-slate-100">This week&apos;s conditions: {conditions.label}</h2>
      <p className="text-sm text-slate-300">{conditions.rationale}</p>
      <p className="text-sm text-slate-200">
        <span className="font-semibold text-slate-100">{publicDecisionLabels.call}:</span> {conditions.guidance}
      </p>
      <p className="text-xs text-slate-400">Data as of {conditions.recordDateLabel}. Every company reads the same conditions.</p>
    </section>
  );
}

export function CompanyPositionSection({ company, situation }: { company: CompanyEntry; situation: CompanySituation }) {
  return (
    <section className={panel}>
      <h2 className="text-lg font-semibold text-slate-100">{company.name}&apos;s position</h2>
      <dl className="weather-grid gap-x-6 gap-y-2 text-sm [--col-min:15rem]">
        {situation.rows.map((row) => (
          <div key={row.label} className="flex flex-col">
            <dt className="text-xs text-slate-400">{row.label}</dt>
            <dd className="font-medium text-slate-100">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-400">As filed for the period ended {situation.asOf}.</p>
      {situation.reading ? (
        <div className="space-y-2" data-testid="company-reading">
          <h3 className="text-sm font-semibold text-slate-100">What that changes</h3>
          {situation.reading.map((sentence) => (
            <p key={sentence} className="text-sm text-slate-300">{sentence}</p>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-slate-400">{situation.disclaimer}</p>
    </section>
  );
}

export function RoleDecisionsSection({
  role,
  decisions,
  shifts,
  rules,
}: {
  role: CompanyRole;
  decisions: readonly string[];
  shifts: readonly string[];
  rules: readonly BoundedDecisionRule[];
}) {
  return (
    <section className={panel}>
      <h2 className="text-lg font-semibold text-slate-100">The decisions in front of {role.label}</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
        {decisions.map((decision) => <li key={decision}>{decision}</li>)}
      </ul>
      <ul className="space-y-1 text-sm text-slate-300">
        {shifts.map((shift) => <li key={shift}>{shift}.</li>)}
      </ul>
      {rules.map((rule) => (
        <div key={rule.area} className="space-y-1 border-t border-[color:var(--border-faint)] pt-3 text-sm text-slate-200">
          <h3 className="font-semibold text-slate-100">{decisionAreaLabel(rule.area)} this week</h3>
          <p><span className="font-medium text-slate-100">{DECISION_CONTRACT_LABELS.action.actionNow}:</span> {formatBoundedDecisionAction(rule)}</p>
          <p><span className="font-medium text-slate-100">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</span> {formatBoundedDecisionThreshold(rule)}</p>
          <p><span className="font-medium text-slate-100">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}:</span> {formatBoundedDecisionReverse(rule)}</p>
        </div>
      ))}
    </section>
  );
}

/** The same role at the next few companies, so every page is a short walk from every other. */
const neighbours = (company: CompanyEntry, count: number): CompanyEntry[] => {
  const start = COMPANIES.findIndex((entry) => entry.slug === company.slug);
  return Array.from({ length: count }, (_unused, index) => COMPANIES[(start + index + 1) % COMPANIES.length]).filter(
    (entry): entry is CompanyEntry => entry !== undefined,
  );
};

export function CompanyNextLinks({ company, role }: { company: CompanyEntry; role?: CompanyRole }) {
  return (
    <section className={panel}>
      <h2 className="text-lg font-semibold text-slate-100">Where to go next</h2>
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <ActionLink href="/" variant="pill">This week&apos;s full brief</ActionLink>
        {COMPANY_ROLES.filter((other) => other.slug !== role?.slug).map((other) => (
          <ActionLink key={other.slug} href={`/companies/${company.slug}/${other.slug}`} variant="pill">
            {other.title} at {company.name}
          </ActionLink>
        ))}
        {role ? <ActionLink href={`/companies/${company.slug}`} variant="pill">{company.name} overview</ActionLink> : null}
        {neighbours(company, 3).map((other) => (
          <ActionLink key={other.slug} href={role ? `/companies/${other.slug}/${role.slug}` : `/companies/${other.slug}`} variant="pill">
            {role ? `${role.title} at ${other.name}` : other.name}
          </ActionLink>
        ))}
        <ActionLink href="/companies" variant="pill">All companies</ActionLink>
      </div>
    </section>
  );
}
