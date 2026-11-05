import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { COMPANY_ROLES, findCompanyRole, findRole, ROLES } from "../lib/report/companyRoles";
import { buildLeadershipQuestionsCopy, leadershipQuestions, runwayAnswers } from "../lib/report/leadershipQuestions";
import { RUNWAY_BAND_OPTIONS } from "../lib/report/operatorRunway";

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
