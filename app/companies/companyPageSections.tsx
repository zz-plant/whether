import { ActionLink } from "../components/ui/actionLink";
import { findLeadAnswerForArea } from "../answers/decisionPages";
import { isIndexableAnswerSlug } from "../../lib/seo/indexationPolicy";
import { COMPANIES, type CompanyEntry } from "../../lib/companies/companyRegistry";
import { COMPANY_ROLES, type CompanyRole } from "../../lib/report/companyRoles";
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
  /** The same date, ISO, for `<time>` and the page's `dateModified`. */
  recordDateIso: string;
  /** Present when live data is late, so these rules are from a saved reading. */
  savedCopyNotice?: string;
};

const panel = "weather-panel space-y-3 px-6 max-sm:px-0 py-6";

export function ConditionsSection({ conditions }: { conditions: WeekConditions }) {
  return (
    <section className={panel}>
      <h2 className="text-lg font-semibold text-slate-100">This week&apos;s conditions: {conditions.label}</h2>
      {conditions.savedCopyNotice ? (
        <p data-testid="company-saved-copy" className="weather-caveat-band weather-caveat-mark px-4 py-3 text-xs">
          {conditions.savedCopyNotice}
        </p>
      ) : null}
      <p className="text-sm text-slate-300">{conditions.rationale}</p>
      <p className="text-sm text-slate-200">
        <span className="font-semibold text-slate-100">{publicDecisionLabels.call}, written for companies that depend on outside funding:</span>{" "}
        {conditions.guidance}
      </p>
      <p className="text-xs text-slate-400">Data as of <time dateTime={conditions.recordDateIso}>{conditions.recordDateLabel}</time>. Every company reads the same conditions.</p>
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
      <p className="text-xs text-slate-400">Worked out from SEC filings for the period ended {situation.asOf}.</p>
      {situation.reading ? (
        <div className="space-y-2" data-testid="company-reading">
          <h3 className="text-sm font-semibold text-slate-100">What that changes</h3>
          {situation.reading.map((sentence) => (
            <p key={sentence} className="text-sm text-slate-300">{sentence}</p>
          ))}
        </div>
      ) : null}
      {situation.budgetCalendar ? (
        <div className="space-y-1" data-testid="company-budget-calendar">
          <h3 className="text-sm font-semibold text-slate-100">Budget calendar</h3>
          <p className="text-sm text-slate-300">{situation.budgetCalendar}</p>
        </div>
      ) : null}
      {situation.restructurings.length > 0 ? (
        <div className="space-y-1" data-testid="company-restructurings">
          <h3 className="text-sm font-semibold text-slate-100">Restructuring filings, last 12 months</h3>
          <ul className="space-y-1 text-sm text-slate-300">
            {situation.restructurings.map((filing) => (
              <li key={filing.url}>
                Filed {filing.filedOn} (8-K item 2.05).{" "}
                <a href={filing.url} rel="noreferrer" className="weather-hit text-[var(--accent-action)] underline underline-offset-4">
                  Read the filing
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400">
            This item reports a plan to exit or restructure part of a business, with material costs. Read the filing for what it covers: it may not say how many people or which groups are affected.
          </p>
        </div>
      ) : null}
      <p className="text-xs text-slate-400">{situation.disclaimer}</p>
    </section>
  );
}

export function RoleDecisionsSection({
  role,
  askFor,
  paybackBar,
  rules,
}: {
  role: CompanyRole;
  /** What this role can ask for under this week's conditions (`askForThisWeek`). */
  askFor: string;
  paybackBar: string;
  rules: readonly BoundedDecisionRule[];
}) {
  return (
    <section className={panel}>
      <h2 className="text-lg font-semibold text-slate-100">The decisions in front of {role.label}</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
        {role.decisions.map((decision) => <li key={decision}>{decision}</li>)}
      </ul>
      <div className="space-y-1" data-testid="company-role-ask">
        <h3 className="text-sm font-semibold text-slate-100">What to ask for this week</h3>
        <p className="text-sm text-slate-200">{askFor}</p>
        <p className="text-sm text-slate-300">{paybackBar}</p>
      </div>
      {rules.map((rule) => {
        /* The question this rule answers, under its own words: the 300 role pages printed each
           general rule and linked to none of the answer pages that argue it. */
        const answer = findLeadAnswerForArea(rule.area);
        return (
          <div key={rule.area} className="space-y-1 border-t border-[color:var(--border-faint)] pt-3 text-sm text-slate-200">
            <h3 className="font-semibold text-slate-100">The general {decisionAreaLabel(rule.area).toLowerCase()} rule this week</h3>
            <p><span className="font-medium text-slate-100">{DECISION_CONTRACT_LABELS.action.actionNow}:</span> {formatBoundedDecisionAction(rule)}</p>
            <p><span className="font-medium text-slate-100">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</span> {formatBoundedDecisionThreshold(rule)}</p>
            <p><span className="font-medium text-slate-100">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}:</span> {formatBoundedDecisionReverse(rule)}</p>
            {answer && isIndexableAnswerSlug(answer.slug) ? (
              <p>Full answer: <ActionLink href={`/answers/${answer.slug}`} variant="inline">{answer.title}</ActionLink></p>
            ) : null}
          </div>
        );
      })}
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
        {role ? <ActionLink href={`/roles/${role.slug}`} variant="pill">{role.title} at any company</ActionLink> : null}
        <ActionLink href="/companies" variant="pill">All companies</ActionLink>
      </div>
    </section>
  );
}
