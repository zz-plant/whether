import { ReportCta } from "../components/reportCta";
import { buildLeadershipQuestionsCopy, leadershipQuestions, runwayAnswers, RUNWAY_QUESTION } from "../../lib/report/leadershipQuestions";
import type { CompanyRole } from "../../lib/report/companyRoles";

/** The way to learn a private company's position: ask, then read the answer against the rules. */
export function LeadershipQuestionsSection({ role, pagePath }: { role: CompanyRole; pagePath: string }) {
  return (
    <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6" data-testid="leadership-questions">
      <h2 className="text-lg font-semibold text-slate-100">Questions to ask at your next all-hands</h2>
      <p className="text-sm text-slate-300">A private company files nothing public, so asking is the way to find out where it stands.</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
        {leadershipQuestions(role).map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-100">What the first answer means</h3>
        <p className="text-xs text-slate-400">{RUNWAY_QUESTION}</p>
        <ul className="space-y-1 text-sm text-slate-300">
          {runwayAnswers().map((answer) => (
            <li key={answer}>{answer}</li>
          ))}
        </ul>
        <p className="text-xs text-slate-400">These are what the published rules would have a company do. Your company may decide differently.</p>
      </div>
      <ReportCta
        href={pagePath}
        label="Copy these questions"
        copyText={buildLeadershipQuestionsCopy(role)}
        copyTarget="Leadership questions"
        telemetryEvent={{ pagePath, cluster: "authority", intent: "vp-product", ctaId: "copy_leadership_questions" }}
        className="weather-button-primary inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-semibold"
      />
    </section>
  );
}
