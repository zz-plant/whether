import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "bun:test";
import { buildBriefMarkdown } from "../app/brief.md/route";
import { computeDiagnostics } from "../lib/regimeEngineDiagnostics";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { DATA_CAVEAT_LABEL, DECISION_READINESS_LABEL } from "../lib/report/trustStatus";
import { buildReportDataFixture } from "./fixtures/reportFixtures";

/*
 * `/brief.md` published an empty "This Week's Call" section — the heading rendered with
 * nothing under it — because the route interpolated `canonicalDecisionCopy`, an object
 * that is null on the live path, into a Markdown template whose `mdValue` maps null to "".
 * The failure is silent by construction: the document still builds, still has every
 * heading, still returns 200, and only a reader notices the hole.
 *
 * So the assertion is structural rather than a string match. A published artifact that
 * people cite must not carry a heading with no body under it, whichever heading it is.
 */
describe("/brief.md", () => {
  const sectionsOf = (markdown: string) => {
    const sections: Array<{ heading: string; body: string }> = [];
    let heading: string | null = null;
    let body: string[] = [];

    for (const line of markdown.split("\n")) {
      const match = /^##\s+(.*)$/.exec(line);
      if (match) {
        if (heading) sections.push({ heading, body: body.join("\n") });
        heading = match[1].trim();
        body = [];
        continue;
      }
      if (heading) body.push(line);
    }
    if (heading) sections.push({ heading, body: body.join("\n") });
    return sections;
  };

  const renderBrief = async () =>
    buildBriefMarkdown(
      await assembleHomePage(
        { searchParams: undefined },
        { loadHomePageReportData: async () => ({ ok: true, data: buildReportDataFixture() }) },
      ),
    );

  it("publishes no heading with an empty body", async () => {
    const markdown = await renderBrief();

    const sections = sectionsOf(markdown);
    assert.ok(sections.length > 0, "expected the brief to publish sections");

    const empty = sections
      .filter((section) => section.body.replaceAll("-", "").replaceAll("*", "").trim() === "")
      .map((section) => section.heading);

    assert.deepEqual(empty, [], `empty section(s) under a heading: ${empty.join(", ")}`);
  });

  it("states the guidance, and never as a serialized object", async () => {
    const markdown = await renderBrief();

    const call = sectionsOf(markdown).find((section) => section.heading === "This Week's Guidance");
    assert.ok(call, "expected a 'This Week's Guidance' section");

    // The three parts of a bounded decision, which is what this section promises.
    // The guidance itself opens the section, unlabelled, as the heading names it;
    // a "Do now" line under it repeated its first sentence.
    assert.match(call.body.trimStart(), /^[A-Z][^*\n]+\./);
    assert.doesNotMatch(call.body, /\*\*Do now:\*\*/);
    assert.match(call.body, /\*\*Pause if:\*\*\s*\S/);
    assert.match(call.body, /\*\*Conditions change if:\*\*\s*\S/);
    assert.match(call.body, /\*\*Resume when:\*\*\s*\S/);

    // The other half of the original defect: a non-null object would have been
    // JSON.stringify'd straight into the artifact.
    assert.doesNotMatch(markdown, /\{"[a-zA-Z]+":/, "brief.md leaked a serialized object");
    assert.doesNotMatch(markdown, /\[object Object\]/);
  });

  it("carries each decision's timing line into the Decisions section", async () => {
    const markdown = await renderBrief();

    const decisions = sectionsOf(markdown).find((section) => section.heading === "Decisions");
    assert.ok(decisions, "expected a 'Decisions' section");

    // Canonical action strip items always carry latency, so the published
    // document answers "when does acting this week actually bite" per lever.
    const timingCount = (decisions.body.match(/· Timing: /g) ?? []).length;
    assert.ok(timingCount > 0, "expected at least one Timing entry in the Decisions section");
  });
});

/*
 * PR #1481 review: on a live week with the scores close to a line, the home
 * model's verdict is Hold, and /brief.md printed the margin and "Data caveat:
 * None." with no verdict. The caveat is about the data, which is live, so it
 * stays "None."; the verdict is its own line under the trust line, read from
 * the home model rather than rebuilt.
 */
describe("/brief.md states the decision readiness verdict", () => {
  const thresholds = { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 };
  const freezingWeek = (tightness: number, riskAppetite: number) =>
    buildReportDataFixture({
      assessment: {
        regime: "SCARCITY",
        scores: { tightness, riskAppetite },
        thresholds,
        diagnostics: computeDiagnostics(tightness, riskAppetite, thresholds),
      },
    });

  const renderWeek = async (reportData: ReturnType<typeof buildReportDataFixture>) => {
    const homepage = await assembleHomePage(
      { searchParams: undefined },
      { loadHomePageReportData: async () => ({ ok: true, data: reportData }) },
    );
    const markdown = buildBriefMarkdown(homepage);
    const lines = markdown.split("\n");
    const at = lines.findIndex((line) => line.startsWith(`> **${DECISION_READINESS_LABEL}:**`));
    return {
      readiness: homepage.weeklyDecisionCardModel.decision.decisionReadiness,
      margin: homepage.weeklyDecisionCardModel.status.confidenceLabel,
      line: lines[at]?.trimEnd(),
      afterTrustLine: at > 0 && (lines[at - 1] ?? "").startsWith("> **Trust:**"),
      provenance: markdown.split("## Provenance")[1]?.split("\n---")[0] ?? "",
    };
  };

  it("says Hold on a live week close to a line, and keeps the data caveat about the data", async () => {
    // Funding pressure 72, two points over its line at 70; nothing held.
    const { readiness, margin, line, afterTrustLine, provenance } = await renderWeek(freezingWeek(72, 40));

    assert.equal(margin, "LOW");
    assert.equal(readiness.label, "Hold");
    assert.equal(line, `> **${DECISION_READINESS_LABEL}:** Hold. ${readiness.detail}`);
    assert.match(readiness.detail, /anything you can't undo can wait/);
    assert.ok(afterTrustLine, "the verdict sits under the trust line, in the first lines a reader scans");
    assert.match(provenance, new RegExp(`\\*\\*${DATA_CAVEAT_LABEL}:\\*\\* None\\.`));
  });

  it("says Act on a live week clear of the lines, and points back to the guidance", async () => {
    const { readiness, margin, line, afterTrustLine } = await renderWeek(freezingWeek(90, 30));

    assert.equal(margin, "HIGH");
    assert.equal(readiness.label, "Act");
    assert.equal(line, `> **${DECISION_READINESS_LABEL}:** Act. ${readiness.detail}`);
    assert.ok(afterTrustLine);
    // Freezing guidance approves only renewals; "Act" means the reading can carry
    // that guidance, so the line must not read as leave to approve more.
    assert.match(readiness.detail, /guidance and its pause lines apply/);
    assert.doesNotMatch(line ?? "", /holding back|hold back|proceed|approval flow/i);
  });

  /*
   * Source-level, and the only way to state it: /trust draws its verdict as the
   * shell's tone, and a route with a trust strip prints no headline for that
   * tone (§1.1.34), so there is no rendered verdict on /trust to compare. Until
   * this change /trust built a second verdict from the freshness label alone
   * and without the hold.
   */
  it("is built once, in the home brief builder that /trust reads too", () => {
    const root = join(import.meta.dirname ?? __dirname, "..");
    const builders = ["app", "lib"].flatMap((dir) =>
      readdirSync(join(root, dir), { recursive: true, encoding: "utf8" })
        .filter((path) => /\.tsx?$/.test(path))
        .map((path) => join(dir, path))
        .filter((path) => readFileSync(join(root, path), "utf8").includes("buildDecisionReadinessState(")),
    );

    assert.deepEqual(builders, [join("lib", "report", "homeBrief", "builders.ts")]);
    assert.match(
      readFileSync(join(root, "app/trust/trustPageModel.ts"), "utf8"),
      /homeBriefModel\.decisionReadiness/,
      "/trust reads the home model's verdict",
    );
  });
});
