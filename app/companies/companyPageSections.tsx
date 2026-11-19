import { ActionLink, PlainActionLink } from "../components/ui/actionLink";
import { companyCalendarPath } from "../../lib/export/calendarFeed";
import { findLeadAnswerForArea } from "../answers/decisionPages";
import { isIndexableAnswerSlug } from "../../lib/seo/indexationPolicy";
import { COMPANIES, type CompanyEntry } from "../../lib/companies/companyRegistry";
import { nextReportLine, reportFigureRows, type CompanyPageRole, type CompanyRole } from "../../lib/report/companyRoles";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { CopyPlanningNote } from "./copyPlanningNote";
import {
  decisionAreaLabel,
  formatBoundedDecisionAction,
  formatBoundedDecisionReverse,
  formatBoundedDecisionThreshold,
  type BoundedDecisionRule,
} from "../../lib/report/boundedDecisionRules";
import type { CompanySituation } from "../../lib/report/companySituation";

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

/**
 * This week's conditions, as lines under the page's heading, with the link back to the brief
 * they come from. They were a section of their own headed "This week's conditions: Cloudy"
 * on every company and role page, an `h2` over three lines that were the page's lead
 * (2026-11-11); each page's "Where to go next" carried the brief link at the foot.
 */
export function WeekConditionsLines({ conditions }: { conditions: WeekConditions }) {
  return (
    <>
      {conditions.savedCopyNotice ? (
        <p data-testid="company-saved-copy" className="weather-caveat-band weather-caveat-mark px-4 py-3 text-xs">
          {conditions.savedCopyNotice}
        </p>
      ) : null}
      <p className="text-sm text-slate-300">
        <span className="font-semibold text-slate-100">This week&apos;s conditions: {conditions.label}.</span> {conditions.rationale}
      </p>
      <p className="text-sm text-slate-200">
        {/* For startups, by name: the page sits under a company that may fund itself from
            revenue, and "written for companies that depend on outside funding" beside
            Microsoft's $60B of free cash flow read as guidance for Microsoft (2026-11-17). */}
        <span className="font-semibold text-slate-100">Whether&apos;s guidance for startups that depend on outside funding:</span>{" "}
        {conditions.guidance}{" "}
        {/* At the end of the guidance it comes from, not on a line of its own: there it
            read as the first item of the role links under it on a company's overview. */}
        <ActionLink href="/" variant="inline">This week&apos;s full brief</ActionLink>
      </p>
      <p className="text-xs text-slate-400">Data as of <time dateTime={conditions.recordDateIso}>{conditions.recordDateLabel}</time>. Every company reads the same conditions.</p>
    </>
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
            Reports material exit or restructuring costs; check the filing for scope (it may not say how many people or teams are affected).
          </p>
        </div>
      ) : null}
      <p className="text-xs text-slate-400">{situation.disclaimer}</p>
    </section>
  );
}

/** A role's decisions under the startup week's rules, for the /roles pages. */
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
            <p><span className="font-medium text-slate-100">{DECISION_CONTRACT_LABELS.action.doNow}:</span> {formatBoundedDecisionAction(rule)}</p>
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

/**
 * The company's planning year: when budgets are set, when the next report is due, and a calendar
 * that carries both. The dates a reader at the company plans around, ahead of anything weekly.
 */
export function CompanyCalendarSection({ company, situation }: { company: CompanyEntry; situation: CompanySituation }) {
  const report = nextReportLine(situation);
  if (!situation.budgetCalendar && !report) return null;
  return (
    <section className={panel} data-testid="company-calendar">
      <h2 className="text-lg font-semibold text-slate-100">{company.name}&apos;s planning calendar</h2>
      {situation.budgetCalendar ? <p className="text-sm text-slate-200">{situation.budgetCalendar}</p> : null}
      {report ? <p className="text-sm text-slate-200">{report}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <PlainActionLink href={companyCalendarPath(company.slug)} variant="ghost">
          Add these dates to your calendar
        </PlainActionLink>
        <p className="text-xs text-slate-400">A subscribed calendar: the dates move on as {company.name} files.</p>
      </div>
    </section>
  );
}

/**
 * What the role takes to each of the company's dates: planning, a 1:1, the quarterly report. The
 * planning line rests on the filed R&D and revenue figures it quotes, and is left out without them.
 */
export function RolePlanningSection({
  role,
  situation,
  note,
}: {
  role: CompanyPageRole;
  situation: CompanySituation;
  /** `buildPlanningNote`, for the copy button. */
  note: string;
}) {
  const figures = reportFigureRows(role, situation);
  return (
    <section className={panel} data-testid="company-role-planning">
      <h2 className="text-lg font-semibold text-slate-100">What to bring</h2>
      {situation.planning ? (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-100">To planning</h3>
          <p className="text-sm text-slate-300">{situation.planning.evidence}</p>
          <p className="text-sm text-slate-200">{role.planning.bring[situation.planning.kind]}</p>
        </div>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-100">To your next 1:1</h3>
        <p className="text-sm text-slate-200">Ask: &ldquo;{role.leadershipQuestion}&rdquo;</p>
      </div>
      {figures.length > 0 ? (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-100">When the next report lands</h3>
          <p className="text-sm text-slate-300">{role.planning.reportWhy} Last filed, for the period ended {situation.asOf}:</p>
          <dl className="weather-grid gap-x-6 gap-y-2 text-sm [--col-min:15rem]">
            {figures.map((row) => (
              <div key={row.label} className="flex flex-col">
                <dt className="text-xs text-slate-400">{row.label}</dt>
                <dd className="font-medium tabular-nums text-slate-100">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-100">The decisions this touches</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
          {role.decisions.map((decision) => <li key={decision}>{decision}</li>)}
        </ul>
      </div>
      <CopyPlanningNote note={note} />
    </section>
  );
}

/**
 * The startup week, for a reader at a large company: the conditions, how they bear on a pitch, and
 * the general rules as one line each with the answer that argues them. The rules' pause and restart
 * scores are a startup's lines, so they stay on the answer pages.
 */
export function RoleMarketSection({
  conditions,
  askFor,
  paybackBar,
  rules,
}: {
  conditions: WeekConditions;
  /** What this role can pitch under this week's conditions (`askForThisWeek`). */
  askFor: string;
  paybackBar: string;
  rules: readonly BoundedDecisionRule[];
}) {
  return (
    <section className={panel}>
      <h2 className="text-lg font-semibold text-slate-100">This week&apos;s market</h2>
      <WeekConditionsLines conditions={conditions} />
      <div className="space-y-1" data-testid="company-role-ask">
        <h3 className="text-sm font-semibold text-slate-100">Pitching this week</h3>
        <p className="text-sm text-slate-200">{askFor}</p>
        <p className="text-sm text-slate-300">{paybackBar}</p>
      </div>
      {rules.length > 0 ? (
        <ul className="space-y-1 text-sm text-slate-200">
          {rules.map((rule) => {
            const answer = findLeadAnswerForArea(rule.area);
            return (
              <li key={rule.area}>
                <span className="font-medium text-slate-100">The {decisionAreaLabel(rule.area).toLowerCase()} rule for startups:</span>{" "}
                {formatBoundedDecisionAction(rule)}.{" "}
                {answer && isIndexableAnswerSlug(answer.slug) ? (
                  <ActionLink href={`/answers/${answer.slug}`} variant="inline">{answer.title}</ActionLink>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
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

/*
 * Only what the page does not already link. The brief is in the conditions lines, and the
 * company's overview, its other roles and the company list are a breadcrumb away; the
 * overview's own row of three neighbours went for the same reason (2026-11-11).
 */
export function CompanyNextLinks({ company, role }: { company: CompanyEntry; role: CompanyPageRole }) {
  return (
    <section className={panel}>
      <h2 className="text-lg font-semibold text-slate-100">Where to go next</h2>
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        {neighbours(company, 3).map((other) => (
          <ActionLink key={other.slug} href={`/companies/${other.slug}/${role.slug}`} variant="pill">
            {role.title} at {other.name}
          </ActionLink>
        ))}
        <ActionLink href={`/roles/${role.slug}`} variant="pill">{role.title} at any company</ActionLink>
      </div>
    </section>
  );
}
