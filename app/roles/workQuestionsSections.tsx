import Link from "next/link";
import type { RegimeKey } from "../../lib/regimeEngine";
import { getRegimePublicLabel, getRegimeWeatherRationale } from "../../lib/regimePresentation";
import {
  buildWorkSituationsCopy,
  STARTING_QUESTION,
  type ConditionQuestion,
  type QuestionTool,
  type WorkSituation,
} from "../../lib/report/workQuestions";
import { ReportCta } from "../components/reportCta";

const panel = "weather-panel space-y-3 px-6 max-sm:px-0 py-6";
const toolLink = "weather-hit inline-flex text-xs font-semibold text-[var(--accent-action)] underline underline-offset-4";

function QuestionToolLink({ tool, pagePath }: { tool: QuestionTool; pagePath: string }) {
  return (
    <ReportCta
      href={tool.href}
      label={tool.label}
      className={toolLink}
      telemetryEvent={{ pagePath, cluster: "authority", intent: "vp-product", ctaId: `question_tool_${tool.key}` }}
    />
  );
}

/** Written by us, so the section says so: beside a role's name, a question could pass for a quote. */
export function ConditionQuestionsSection({
  regime,
  questions,
  pagePath,
}: {
  regime: RegimeKey;
  questions: readonly ConditionQuestion[];
  pagePath: string;
}) {
  if (questions.length === 0) return null;
  return (
    <section className={panel} data-testid="condition-questions">
      <h2 className="text-lg font-semibold text-slate-100">What might come up in {getRegimePublicLabel(regime)} conditions</h2>
      <p className="text-sm text-slate-300">
        {getRegimeWeatherRationale(regime)} We wrote these as examples. They are not quotes or survey results.
      </p>
      <ul className="space-y-3">
        {questions.map(({ who, question, roleHref, tool }) => (
          <li key={question} className="space-y-1 border-t border-[color:var(--border-faint)] pt-3">
            <p className="text-xs text-slate-400">
              {roleHref && roleHref !== pagePath ? (
                <Link href={roleHref} className="underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
                  {who}
                </Link>
              ) : (
                who
              )}
            </p>
            <p className="text-sm text-slate-200">{question}</p>
            {tool ? <QuestionToolLink tool={tool} pagePath={pagePath} /> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WorkSituationsSection({ situations, pagePath }: { situations: readonly WorkSituation[]; pagePath: string }) {
  if (situations.length === 0) return null;
  return (
    <section className={panel} data-testid="work-situations">
      <h2 className="text-lg font-semibold text-slate-100">The questions that come with the work</h2>
      <p className="text-sm text-slate-200">{STARTING_QUESTION}</p>
      <div className="space-y-3">
        {situations.map(({ situation, askingYourself, beingAsked, tool }) => (
          <div key={situation} className="space-y-1 border-t border-[color:var(--border-faint)] pt-3 text-sm text-slate-200">
            <h3 className="font-semibold text-slate-100">{situation}</h3>
            <p><span className="font-medium text-slate-100">You&apos;re asking:</span> {askingYourself}</p>
            <p><span className="font-medium text-slate-100">You&apos;re being asked:</span> {beingAsked}</p>
            {tool ? <QuestionToolLink tool={tool} pagePath={pagePath} /> : null}
          </div>
        ))}
      </div>
      <ReportCta
        href={pagePath}
        label="Copy what you'll be asked"
        copyText={buildWorkSituationsCopy(situations)}
        copyTarget="Questions to be ready for"
        telemetryEvent={{ pagePath, cluster: "authority", intent: "vp-product", ctaId: "copy_work_questions" }}
        className="weather-button-primary inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-semibold"
      />
    </section>
  );
}
