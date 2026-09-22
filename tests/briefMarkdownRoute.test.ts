import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildBriefMarkdown } from "../app/brief.md/route";
import { assembleHomePage } from "../lib/report/homePageAssembler";
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

  it("states the call, and never as a serialized object", async () => {
    const markdown = await renderBrief();

    const call = sectionsOf(markdown).find((section) => section.heading === "This Week's Call");
    assert.ok(call, "expected a 'This Week's Call' section");

    // The three parts of a bounded decision, which is what this section promises.
    assert.match(call.body, /\*\*Do now:\*\*\s*\S/);
    assert.match(call.body, /\*\*Pause if:\*\*\s*\S/);
    assert.match(call.body, /\*\*Call changes if:\*\*\s*\S/);

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
