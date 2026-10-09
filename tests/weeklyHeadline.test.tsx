import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";

import { weeklyHeadline } from "../lib/report/reportEvidence";
import { formatGuidance } from "../lib/export/briefBuilders";
import { getPublishedBriefs, publishedBriefHeadline } from "../lib/report/publishedBriefs";
import { POLICY_OVERRIDE_CALL } from "../lib/report/reportCopy";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";

const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * One headline action per week (site review, 2026-10-09). /brief/2026-w41 led with
 * "Approve only renewals, work already promised to customers, and hires that bring
 * in revenue." and then printed "Do now: Conditions are tightening. Freeze new
 * commitments and protect runway."; the homepage's h1 was the second sentence, and
 * the answer pages led with an area's rule and a different "Do now". `weeklyHeadline`
 * is the one source now, and the call is the headline: the more concrete of the two
 * sentences, the same for every reader, and already worded for a held week.
 */

const textOf = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

describe("the week's headline action", () => {
  it("is the call, opened by the week's direction, and drops the action's own instruction", () => {
    const headline = weeklyHeadline({
      actionNow: "Conditions are tightening. Freeze new commitments and protect runway.",
      currentCall: "Approve only renewals, work already promised to customers, and hires that bring in revenue.",
    });
    assert.equal(headline.action, "Approve only renewals, work already promised to customers, and hires that bring in revenue.");
    assert.equal(headline.directionLabel, "Tightening this week");
    assert.equal(
      headline.composed,
      "Conditions are tightening. Approve only renewals, work already promised to customers, and hires that bring in revenue.",
    );
    assert.ok(!headline.composed.includes("Freeze new commitments"));
  });

  it("leads with a held week's action, since its call explains the hold", () => {
    const hold = POLICY_OVERRIDE_CALL["signals-disagree"];
    const headline = weeklyHeadline({ ...hold, policyOverrideActive: true });
    assert.equal(headline.action, hold.actionNow);
    assert.equal(headline.composed, `${hold.actionNow} ${hold.currentCall}`);
  });

  it("reads a frozen week's direction from either stored shape", () => {
    const legacy = weeklyHeadline({
      actionNow: "Conditions tightening — freeze new commitments and keep spend flexible.",
      currentCall: "Keep expansion selective.",
    });
    assert.equal(legacy.directionLabel, "Tightening this week");
    assert.equal(legacy.action, "Keep expansion selective.");
  });

  it("is what every paste leads with", () => {
    const call = {
      actionNow: "Conditions are easing. Resume paused work with clear milestones.",
      currentCall: "Spend only on renewals, work already promised to customers, and hires that bring in revenue.",
    };
    assert.equal(formatGuidance(call), weeklyHeadline(call).composed);
  });

  /* Every frozen week: the record's page leads with its stored call, and no
     "Do now" line in its card repeats the stored action beside it. */
  it("leads every frozen brief's card, with no second headline under it", async () => {
    const page = await import("../app/brief/[week]/page");
    for (const brief of getPublishedBriefs().slice(0, 3)) {
      const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ week: brief.slug }) }));
      const card = textOf(html.slice(html.indexOf('id="share-ready-artifact"'), html.indexOf("</section>", html.indexOf('id="share-ready-artifact"'))));
      assert.ok(card.includes(publishedBriefHeadline(brief).action), `${brief.slug}: the card leads with the headline`);
      assert.ok(!/\bDo now\b/.test(card), `${brief.slug}: the card prints a second headline under "Do now"`);
    }
  });

  it("leads every answer page with the week's headline, and the page's area as an area line", async () => {
    const { DecisionAnswerPageContent } = await import("../app/answers/decisionAnswerPageContent");
    const { snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "test" });
    const headline = weeklyHeadline(snapshot.weeklyCall);
    const html = renderToStaticMarkup(
      await DecisionAnswerPageContent({ slug: "should-startups-raise-capital-now", route: "/answers/should-startups-raise-capital-now" }),
    );
    const card = textOf(html.slice(html.indexOf('id="share-ready-artifact"'), html.indexOf("</section>", html.indexOf('id="share-ready-artifact"'))));
    assert.ok(card.includes(headline.action), "the card leads with the week's headline");
    assert.match(card, /Fundraising · Do now/, "the page's area follows as an area line");
  });

  /* The homepage suspends at its data boundary in this suite, so these read its source:
     the claim is which value the route hands its h1, Copy Brief and the sticky strip. */
  it("is the homepage h1, its Copy Brief and its sticky strip", () => {
    const route = readFileSync("app/page.tsx", "utf8");
    assert.match(route, /deriveBriefCallFields\(homepage\.weeklyDecisionCardModel, homepage\.weeklyCall\)/);
    assert.match(route, /const cardCall = \{ action: headline\.action, directionLabel: headline\.directionLabel \}/);
    assert.match(route, /weeklyCall=\{cardCall\.action\}/);
    const builder = readFileSync("lib/report/homeBrief/briefArtifactBuilder.ts", "utf8");
    assert.match(builder, /const headline = weeklyHeadline\(weeklyCall\);\s*const primaryCall = headline\.composed;/);
  });
});
