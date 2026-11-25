import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AlertSection } from "../app/components/home/AlertSection";
import { PresentModeButton } from "../app/components/PresentModeButton";
import { BoardSlidePreviewLink } from "../app/components/home/BoardSlidePreviewLink";
import { FooterAgentColophon } from "../app/components/footerAgentColophon";
import { isActivationEvent } from "../lib/activationFunnel";
import { stressTestDecisionPlan } from "../lib/decisionShield";
import { buildPlanTestHref } from "../lib/navigation/planningNavigation";
import { decisionAreaOrder } from "../lib/report/boundedDecisionRules";
import { AREA_TEST_PLANS, HOME_MONDAY_EMAIL_HASH, ROLE_FORMAT_LINKS } from "../lib/report/home/homeSectionModel";
import { evaluateRegime } from "../lib/regimeEngine";

describe("the Monday email link", () => {
  it("names an anchor the form carries", () => {
    assert.match(renderToStaticMarkup(<AlertSection />), new RegExp(`id="${HOME_MONDAY_EMAIL_HASH}"`));
  });

  it("leaves the form on alerts only for a reader who scrolled to it", () => {
    assert.match(renderToStaticMarkup(<AlertSection />), /No weekly newsletter/);
  });

  it("is still a Monday form for a reader from a shared link", () => {
    const monday = renderToStaticMarkup(<AlertSection defaultFrequency="weekly" />);
    assert.match(monday, /Monday morning/);
    assert.doesNotMatch(monday, /No weekly newsletter/);
  });
});

describe("the stress test's one-click examples", () => {
  const assessment = evaluateRegime({
    source: "https://example.com/treasury",
    record_date: "2026-08-31",
    fetched_at: "2026-08-31T09:00:00.000Z",
    isLive: true,
    yields: {
      oneMonth: 5.2,
      twoYear: 4.8,
      tenYear: 4.5,
    },
  });

  it("name a move the test grades, for every area but the one it has no rules for", () => {
    for (const area of decisionAreaOrder) {
      const plan = AREA_TEST_PLANS[area];
      if (area === "capital-raising") {
        assert.equal(plan, undefined, "the test says Not graded for a raise, so no link should open on that");
        continue;
      }
      assert.ok(plan, `${area} has no example`);
      const result = stressTestDecisionPlan(assessment, { planText: plan, lifecycle: "GROWTH" });
      assert.notEqual(result.verdict, null, `"${plan}" would open on "Not graded"`);
    }
  });

  it("carry the plan in the link the test reads it from", () => {
    assert.equal(buildPlanTestHref("Raise a $2M seed round"), "/operate?plan=Raise%20a%20%242M%20seed%20round#ops-decision-shield");
  });
});

describe("the formats a role came for", () => {
  it("point at formats and a section /share has", () => {
    const share = readFileSync("app/share/page.tsx", "utf8");
    const files = readFileSync("app/share/shareImageArtifacts.tsx", "utf8");
    for (const { href } of ROLE_FORMAT_LINKS) {
      const hash = href.split("#")[1] ?? "";
      assert.ok(share.includes(`id: "${hash}"`) || files.includes(`id="${hash}"`), `${href} opens nothing on /share`);
    }
  });
});

/*
 * The craft behind the folds (2026-11-21). Each of these existed and was
 * reachable only by knowing where to click: a 16px resize glyph opened a
 * three-slide deck, the board-slide export was a link halfway down /share, and
 * the Markdown/MCP doors were on /api-docs and /share alone. The doors are
 * labelled now, and the previews still cost nothing until a reader shows
 * interest.
 */
describe("the buried craft has a visible door", () => {
  it("labels the presentation deck and its key instead of an unlabeled glyph", () => {
    const html = renderToStaticMarkup(<PresentModeButton />);
    assert.match(html, />Present</);
    assert.match(html, /3-slide deck/);
    assert.match(html, />F</);
  });

  it("labels the board slide and loads no preview bytes until interest", () => {
    const html = renderToStaticMarkup(
      <BoardSlidePreviewLink href="/share#image-artifacts" label="Board slide" stage="Series B" />,
    );
    assert.match(html, />Board slide</);
    assert.match(html, /popover="hint"/);
    assert.doesNotMatch(html, /<img/, "the hovercard image mounts only after hover or focus");
  });

  it("puts the Markdown request and the MCP docs in the footer", () => {
    const html = renderToStaticMarkup(<FooterAgentColophon />);
    assert.match(html, /curl -H &quot;Accept: text\/markdown&quot; https:\/\/whether\.work/);
    assert.match(html, /href="\/api-docs"/);
    assert.match(html, /<output aria-live="polite"[^>]*data-visible="false"><\/output>/, "status bubble stays empty at rest so screen readers do not read a stale Copied");
  });

  it("carries the assistant handoff in the share rail", () => {
    const rail = readFileSync("app/components/shareRail.tsx", "utf8");
    assert.match(rail, /buildAssistantLinks/);
    assert.match(rail, /Ask an assistant/);
    assert.match(rail, /assistantLinks\.map/, "the names come from the one prompt builder, not a second list");
  });
});

describe("the oriented event", () => {
  it("carries a section name and nothing a reader typed", () => {
    assert.ok(isActivationEvent({ step: "oriented", path: "/", section: "what-it-changes" }));
    assert.ok(isActivationEvent({ step: "oriented", path: "/", section: "" }));
    assert.ok(isActivationEvent({ step: "oriented", path: "/" }), "events from before the field still parse");
    assert.equal(isActivationEvent({ step: "oriented", path: "/", section: "Raise $2M from Acme" }), false);
    assert.equal(isActivationEvent({ step: "oriented", path: "/", section: "x".repeat(65) }), false);
  });
});
