import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import * as nextNavigation from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import { COMPANY_ROLES, findCompanyRole, findRole, ROLES } from "../lib/report/companyRoles";
import { buildLeadershipQuestionsCopy, leadershipQuestions, runwayAnswers } from "../lib/report/leadershipQuestions";
import { RUNWAY_BAND_OPTIONS } from "../lib/report/operatorRunway";
import {
  buildWorkSituationsCopy,
  conditionQuestionForRole,
  conditionQuestions,
  WORK_SITUATIONS,
  workSituationsForRole,
} from "../lib/report/workQuestions";

/* `ReportCta` reaches for the router, and this file renders it with no app mounted. */
const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

describe("roles at any company", () => {
  it("adds families to the role pages without adding company pages", () => {
    assert.equal(ROLES.length, 10);
    assert.equal(COMPANY_ROLES.length, 6);
    assert.ok(findRole("recruiters"));
    assert.equal(findCompanyRole("recruiters"), undefined);
    assert.ok(findCompanyRole("software-engineers"));
  });

  it("gives every role its own decisions, asks and question", () => {
    const seen = new Set<string>();
    for (const role of ROLES) {
      for (const line of [...role.decisions, role.leadershipQuestion, ...Object.values(role.askFor)]) {
        assert.ok(!seen.has(line), `${role.slug} repeats "${line}"`);
        seen.add(line);
      }
      assert.equal(new Set(Object.values(role.askFor)).size, 3, role.slug);
    }
  });
});

describe("questions to ask leadership", () => {
  it("opens with runway and ends on the role's own question", () => {
    for (const role of ROLES) {
      const questions = leadershipQuestions(role);
      assert.match(questions[0] ?? "", /months of runway/);
      assert.equal(questions.at(-1), role.leadershipQuestion);
      assert.equal(new Set(questions).size, questions.length, role.slug);
    }
  });

  it("explains every runway band, and the company with nothing counting down", () => {
    const answers = runwayAnswers();
    assert.equal(answers.length, RUNWAY_BAND_OPTIONS.length + 1);
    assert.match(answers[0] ?? "", /^Less than 6 months: .*hold new commitments/);
    assert.match(answers[1] ?? "", /^6–12 months: .*inside 6 months/);
    assert.match(answers.at(-1) ?? "", /^Revenue covers spending: /);
  });

  it("copies as one message, with no figures in it", () => {
    const role = findRole("designers");
    assert.ok(role);
    const copy = buildLeadershipQuestionsCopy(role);
    assert.match(copy, /^Questions for our next all-hands:\n- How many months/);
    assert.ok(copy.endsWith(`- ${role.leadershipQuestion}`));
    assert.doesNotMatch(copy, /\$|\d+ months/);
  });

  it("says the rules are not the company's decision", async () => {
    const { LeadershipQuestionsSection } = await import("../app/roles/leadershipQuestionsSection");
    const role = findRole("finance-teams");
    assert.ok(role);
    const html = renderToStaticMarkup(<LeadershipQuestionsSection role={role} pagePath="/roles/finance-teams" />);
    assert.match(html, /Your company may decide differently/);
    assert.match(html, /Copy these questions/);
    assert.match(html, /What would we stop first if revenue came in below plan/);
  });
});

describe("questions that come with the work", () => {
  const regimes = ["EXPANSION", "DEFENSIVE", "VOLATILE", "SCARCITY"] as const;

  it("gives each set of conditions its own questions, with no question twice", () => {
    const seen = new Set<string>();
    for (const regime of regimes) {
      const questions = conditionQuestions(regime);
      assert.ok(questions.length >= 5, regime);
      for (const { question } of questions) {
        assert.ok(!seen.has(question), `repeats "${question}"`);
        seen.add(question);
      }
    }
  });

  it("links a seat to a role page only where that page exists", () => {
    for (const regime of regimes) {
      for (const { roleHref } of conditionQuestions(regime)) {
        if (roleHref) assert.ok(findRole(roleHref.replace("/roles/", "")), roleHref);
      }
    }
  });

  it("prints the stage from the stage vocabulary", () => {
    const whos = conditionQuestions("SCARCITY").map(({ who }) => who);
    assert.ok(whos.includes("Founder · Seed"));
    assert.ok(whos.includes("Board member · Series B+"));
    assert.ok(whos.includes("Technical founder · Bootstrapped"));
  });

  it("gives a role page its own question, and nothing where the seat has none", () => {
    assert.match(conditionQuestionForRole("engineering-managers", "VOLATILE")?.question ?? "", /stay monthly/);
    assert.match(conditionQuestionForRole("finance-teams", "SCARCITY")?.question ?? "", /saves \$200k/);
    assert.equal(conditionQuestionForRole("finance-teams", "EXPANSION"), undefined);
    assert.equal(conditionQuestionForRole("designers", "SCARCITY"), undefined);
  });

  it("says the questions are not quotes, and renders nothing with none to show", async () => {
    const { ConditionQuestionsSection } = await import("../app/roles/workQuestionsSections");
    const html = renderToStaticMarkup(
      <ConditionQuestionsSection regime="SCARCITY" questions={conditionQuestions("SCARCITY")} pagePath="/roles" />,
    );
    assert.match(html, /What might come up in Freezing conditions/);
    assert.match(html, /Money is expensive and hard to raise/);
    assert.match(html, /not quotes or survey results/);
    assert.match(html, /href="\/decisions"/);
    assert.equal(renderToStaticMarkup(<ConditionQuestionsSection regime="SCARCITY" questions={[]} pagePath="/roles" />), "");
  });

  it("does not link a role page to itself", async () => {
    const { ConditionQuestionsSection } = await import("../app/roles/workQuestionsSections");
    const path = "/roles/engineering-managers";
    const question = conditionQuestionForRole("engineering-managers", "VOLATILE");
    assert.ok(question);
    const html = renderToStaticMarkup(<ConditionQuestionsSection regime="VOLATILE" questions={[question]} pagePath={path} />);
    assert.doesNotMatch(html, new RegExp(`href="${path}"`));
    assert.match(html, /Engineering lead · Series A/);
  });

  it("prints the eight situations only for engineering and product leads", async () => {
    assert.equal(workSituationsForRole("engineering-managers").length, 8);
    assert.equal(workSituationsForRole("product-managers").length, 8);
    assert.equal(workSituationsForRole("designers").length, 0);

    const { WorkSituationsSection } = await import("../app/roles/workQuestionsSections");
    const html = renderToStaticMarkup(<WorkSituationsSection situations={WORK_SITUATIONS} pagePath="/roles/product-managers" />);
    assert.match(html, /Is this worth the time and money/);
    assert.match(html, /Copy what you&#x27;ll be asked/);
    assert.equal(renderToStaticMarkup(<WorkSituationsSection situations={[]} pagePath="/roles/designers" />), "");
  });

  it("claims no tool for whether finished work paid off, which none measures", () => {
    const paidOff = WORK_SITUATIONS.find(({ situation }) => situation === "Checking whether the work paid off");
    assert.ok(paidOff);
    assert.equal(paidOff.tool, undefined);
  });

  it("copies what you'll be asked, not what you're asking yourself", () => {
    const copy = buildWorkSituationsCopy(WORK_SITUATIONS);
    assert.match(copy, /^Questions to be ready for:\n- What does this buy us/);
    assert.doesNotMatch(copy, /How do I show/);
    assert.equal(copy.split("\n").length, WORK_SITUATIONS.length + 1);
  });
});
