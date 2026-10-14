import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";

import goldenFormats from "./fixtures/briefFormats.golden.json";
import { buildCanonicalBoundedDecisionRules, buildScopedVariantDecisionAdjustment, isStartupVariantMode } from "../lib/report/boundedDecisionRules";
import { buildFlipThreshold } from "../lib/report/reportEvidence";
import { buildPublishedBriefEmailUpdate, buildPublishedBriefSlackUpdate, getPublishedBriefs } from "../lib/report/publishedBriefs";
import { navigationGroups, navigationPages, utilityLinks } from "../lib/navigation/informationArchitecture";
import { decisionTransmissionSearchDescription, homeDecisionFaqItems } from "../lib/report/decisionTransmissionCopy";
import { buildLlmsTxt } from "../lib/seo/llmsTxt";
import { buildLlmsFullCorpus } from "../lib/seo/llmsFullCorpus";
import { postureArchiveStaticParams } from "../lib/summary/postureArchive";
import { REGIME_ORDER } from "../lib/regimePresentation";

/* /history's explorer reads the router; spread the real module, as every stub here does. */
const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => "/history",
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * Two clause shapes, found in a line-editing pass over the rendered site on 2026-10-09 (the
 * same pass the owner ran on nextconsensus-site, kanav-net, cwt-main, et and stims). Every
 * other guard was green through both, because neither is a word.
 *
 * 1. A wh-clause stapled onto a list. "Look up what the guidance said in any past month, and
 *    how it held up." "Each rule below then says what it changes at that runway: which area
 *    protects runway fastest, and what a burn cut buys." "This week's guidance, why it
 *    changed, and how much to trust it." Two forms fail:
 *    - a pair split by a comma before "and <wh>": "<A>, and <what|how|…> …";
 *    - after a colon, a list of wh-clauses that closes on a noun phrase ("…: what to do now,
 *      the line that pauses it, and the line that resumes it");
 *    - a list that opens on a noun phrase and closes on ", and <wh> …". An opening that is an
 *      adverbial ("For each major commitment, ask what…, what…, and how…") is not a noun
 *      phrase, so it does not count as the list's first item.
 *    A question is exempt ("How sure are we, and what would change our mind?"), and so is a
 *    list whose items are all wh-clauses ("what moved, why it matters, and what would change
 *    the guidance"), which is one kind of phrase.
 * 2. The same gloss twice in one sentence. "Funding pressure was 79 (money is hard to raise)
 *    then and is 90 (money is hard to raise) now", and the change line's "(90 today) … (49
 *    today)". Digits are ignored, so "(90 today)" and "(49 today)" count as one gloss. Exempt:
 *    the ladders' distance tags ("(24 pts away)", "(crossed)", "(at the line)"), which are a
 *    structured form rather than a gloss, and the API argument notes on /llms.txt
 *    ("(optional number)").
 *
 * Plus the builders the pass fixed once for every page: no rule line, change line or stage
 * line carries a reading in parentheses ("(already true at 90)", "(90 today)").
 *
 * Not judged: /terms-of-service and /acceptable-use-policy, drafted for legal precision rather
 * than reading, and the frozen records' stored words beyond the reading form publishedBriefs
 * restates. Uniform lists are allowed, so a nested one ("which to keep, which to gate … and
 * which to pause, and how to lift …") passes this test and is left to review.
 */

const WH = "(?:what|how|when|who|whom|which|where|why|whether)";
const STAPLED_PAIR = new RegExp(`^[^,]+,\\s+(?:and|or)\\s+${WH}\\b[^,]*$`, "i");
const ADVERBIAL_OPENING = "(?:for|in|if|when|since|after|before|as|on|at|by|with|once|while|although|because|until|unless|to)\\b";
const NOUN_LIST_ENDING_IN_WH = new RegExp(`^(?!${ADVERBIAL_OPENING})(?![^,]*\\b${WH}\\b)[^,]+(?:,\\s+[^,]+)*,\\s+(?:and|or)\\s+${WH}\\b`, "i");
/* The mirror shape, after a colon only: wh-clauses that close on a noun phrase ("…: what to do now,
   the line that pauses it, and the line that resumes it"). */
const WH_LIST_ENDING_IN_NOUN = new RegExp(`^${WH}\\b[^,]+(?:,\\s+[^,]+)*,\\s+(?:and|or)\\s+(?:the|a|an|its|their|this|each)\\b`, "i");
const STRUCTURED_TAG = /^(?:# pts? away|crossed|at the line|already met|optional[^)]*|required)$/i;

/** The part of a sentence a list lives in: after its last colon, when the list follows one. */
const listPart = (sentence: string) => {
  const colon = sentence.lastIndexOf(":");
  const tail = colon === -1 ? "" : sentence.slice(colon + 1);
  return tail.includes(",") ? tail.trim() : sentence;
};

const isStapled = (sentence: string) => {
  if (/\?\s*$/.test(sentence)) return false;
  const list = listPart(sentence);
  return STAPLED_PAIR.test(list) || NOUN_LIST_ENDING_IN_WH.test(list) || (list !== sentence && WH_LIST_ENDING_IN_NOUN.test(list));
};

const repeatedGloss = (sentence: string): string | null => {
  const glosses = [...sentence.matchAll(/\(([^()]+)\)/g)]
    .map((match) => match[1].replace(/\d+(?:\.\d+)?/g, "#").trim())
    .filter((gloss) => /[a-z]{3}/i.test(gloss) && gloss.split(/\s+/).length >= 2 && !STRUCTURED_TAG.test(gloss));
  return glosses.find((gloss, index) => glosses.indexOf(gloss) !== index) ?? null;
};

/** Visible text, one block per line: tags that end a block become line breaks, `<code>` goes. */
const blocksOf = (html: string) =>
  html
    .replace(/<(script|style|code|pre|svg)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(p|li|h[1-6]|div|td|th|dt|dd|section|header|footer|summary|caption|figcaption|button|label|br)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;/g, "’")
    .replace(/&mdash;/g, "—")
    .split(/\n+/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const sentencesOf = (text: string) =>
  text
    .split(/\n+/)
    .flatMap((line) => line.replace(/^[-*•>#\s]+/, "").split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/))
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 3);

type Finding = { surface: string; sentence: string; why: string };

const judge = (surface: string, text: string): Finding[] =>
  sentencesOf(text).flatMap((sentence) => {
    const findings: Finding[] = [];
    if (isStapled(sentence)) findings.push({ surface, sentence, why: "wh-clause stapled onto a list" });
    const gloss = repeatedGloss(sentence);
    if (gloss) findings.push({ surface, sentence, why: `gloss "(${gloss})" twice` });
    return findings;
  });

const report = (findings: Finding[]) => findings.map(({ surface, sentence, why }) => `${surface}: ${why}: ${sentence}`).join("\n");

const textOf = (html: string) => blocksOf(html).join("\n");

describe("the detectors", () => {
  it("catch the stapled shapes the pass fixed, and pass questions and uniform lists", () => {
    for (const stapled of [
      "Look up what the guidance said in any past month, and how it held up.",
      "What was counted, and what counted as a hold.",
      "Each rule below then says what it changes at that runway: which area protects runway fastest, and what a burn cut buys.",
      "This week's guidance, why it changed, and how much to trust it.",
      "A short checklist for the pause line: its number, how long a breach must last, who acts, and how to roll back.",
      "Where it fits, and where it does not",
      "For hiring, fundraising, spending and runway: what to do now, the line that pauses it, and the line that resumes it.",
    ]) {
      assert.ok(isStapled(stapled), stapled);
    }
    for (const fine of [
      "How sure are we, and what would change our mind?",
      "Each week it answers three things: what should change right now, how sure we are, and what would change the guidance.",
      "Check how fresh the sources are, how sure the reading is, and how the scores are built, before acting on anything you can't undo.",
      "Every week's guidance stays published unedited, and the track record scores the archive against what happened next.",
      "The pause-and-resume structure comes from earlier work on healthcare products.",
      "For each major commitment, ask what assumption is carrying most downside, what signal confirms it, and how quickly it can be observed.",
    ]) {
      assert.ok(!isStapled(fine), fine);
    }
  });

  it("catch a gloss printed twice, digits aside, and pass the ladders' distance tags", () => {
    assert.equal(repeatedGloss("Funding pressure was 79 (money is hard to raise) then and is 90 (money is hard to raise) now."), "money is hard to raise");
    assert.equal(repeatedGloss("Funding pressure falls 20 pts to 70 or below (90 today) or risk appetite rises 1 pt to clear 50 (49 today)."), "# today");
    assert.equal(repeatedGloss("Pause if < 44 (4 pts away) Resume when > 54 (6 pts away)"), null);
    assert.equal(repeatedGloss("Risk appetite was 7 then (investors are avoiding risk) and is 49 now (investors are selective about risk)."), null);
  });
});

describe("reader copy carries no stapled wh-clause and no repeated gloss", () => {
  it("on the pages that render offline", async () => {
    const pages: Array<[string, () => Promise<string>]> = [
      ["/about", async () => textOf(renderToStaticMarkup((await import("../app/about/page")).default()))],
      ["/privacy", async () => textOf(renderToStaticMarkup((await import("../app/privacy/page")).default()))],
      ["/calibration", async () => textOf(renderToStaticMarkup((await import("../app/calibration/page")).default()))],
      ["/concepts", async () => textOf(renderToStaticMarkup((await import("../app/concepts/page")).default()))],
      ["/api-docs", async () => textOf(renderToStaticMarkup((await import("../app/api-docs/page")).default()))],
      ["/contact", async () => textOf(renderToStaticMarkup((await import("../app/contact/page")).default()))],
      ["/resources", async () => textOf(renderToStaticMarkup(await (await import("../app/resources/page")).default({})))],
      ["/trust", async () => textOf(renderToStaticMarkup(await (await import("../app/trust/page")).default({})))],
      [
        "/history",
        async () => textOf(renderToStaticMarkup(await (await import("../app/history/page")).default({ searchParams: Promise.resolve({}) }))),
      ],
      ...postureArchiveStaticParams.map(({ period }): [string, () => Promise<string>] => [
        `/history/${period}`,
        async () =>
          textOf(renderToStaticMarkup(await (await import("../app/history/[period]/page")).default({ params: Promise.resolve({ period }) }))),
      ]),
    ];
    const findings: Finding[] = [];
    for (const [surface, render] of pages) findings.push(...judge(surface, await render()));
    assert.deepEqual(findings, [], report(findings));
  });

  it("in the page descriptions, the navigation and the homepage's answers", async () => {
    const descriptions = await Promise.all(
      [
        import("../app/about/page"),
        import("../app/privacy/page"),
        import("../app/calibration/page"),
        import("../app/concepts/page"),
        import("../app/api-docs/page"),
        import("../app/resources/page"),
        import("../app/trust/page"),
        import("../app/signals/page"),
        import("../app/share/page"),
        import("../app/operate/page"),
        import("../app/history/page"),
      ].map(async (module) => (await module).metadata?.description ?? ""),
    );
    const text = [
      ...descriptions,
      ...navigationGroups.map((group) => group.description),
      ...navigationPages.map((entry) => entry.description ?? ""),
      ...utilityLinks.map((link) => link.description ?? ""),
      decisionTransmissionSearchDescription,
      ...homeDecisionFaqItems.map((item) => item.answer),
    ].join("\n");
    const findings = judge("descriptions", text);
    assert.deepEqual(findings, [], report(findings));
  });

  it("in every paste, slide and email the share page and the Monday sends print", () => {
    const findings = Object.entries(goldenFormats).flatMap(([week, formats]) =>
      Object.entries(formats).flatMap(([format, value]) => judge(`${week} · ${format}`, typeof value === "string" ? value : JSON.stringify(value))),
    );
    assert.deepEqual(findings, [], report(findings));
  });

  it("in the frozen records' Slack and email updates and in llms.txt", () => {
    const findings = [
      ...getPublishedBriefs().flatMap((brief) => [
        ...judge(`${brief.slug} slack`, buildPublishedBriefSlackUpdate(brief)),
        ...judge(`${brief.slug} email`, buildPublishedBriefEmailUpdate(brief)),
      ]),
      ...judge("/llms.txt", buildLlmsTxt("https://whether.work")),
      ...judge("/llms-full.txt", buildLlmsFullCorpus("https://whether.work")),
    ];
    assert.deepEqual(findings, [], report(findings));
  });
});

describe("the rule-line builders print a reading after the rule, never in parentheses inside it", () => {
  const thresholds = { tightnessRegime: 70, riskAppetiteRegime: 50 };
  const grid = [10, 32, 45, 66, 70, 76, 90].flatMap((tightness) => [7, 41, 44, 49, 50, 54, 62].map((riskAppetite) => ({ tightness, riskAppetite })));

  it("for every area's pause and resume line, every stage's lines and the change line", () => {
    const lines = REGIME_ORDER.flatMap((regime) =>
      grid.flatMap((scores) => {
        const rules = buildCanonicalBoundedDecisionRules({ regime, thresholds, scores });
        const stages = ["seed", "series-a", "series-b", "growth", "public", "bootstrapped"].filter(isStartupVariantMode).map((mode) =>
          buildScopedVariantDecisionAdjustment({ mode, thresholds, scores }),
        );
        return [
          ...rules.flatMap((rule) => [rule.pauseTrigger, rule.resumeTrigger]),
          ...stages.flatMap((stage) => [...stage.watchAdjustments, stage.reversalTriggerDiscipline]),
          buildFlipThreshold({ regime, thresholds, scores }),
        ];
      }),
    );
    const withParentheses = [...new Set(lines.filter((line) => /\(/.test(line)))];
    assert.deepEqual(withParentheses, [], withParentheses.slice(0, 5).join("\n"));
  });

  it("and the frozen records print their stored readings the same way", () => {
    const stored = getPublishedBriefs().flatMap((brief) => [buildPublishedBriefSlackUpdate(brief), buildPublishedBriefEmailUpdate(brief)]);
    const leftovers = stored.flatMap((text) => text.match(/\((?:already true at \d+|\d+ today)\)/g) ?? []);
    assert.deepEqual(leftovers, []);
  });
});
