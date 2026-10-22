import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  findActiveGroup,
  normalizePathname,
  resolveGlobalHeaderNavigationLinks,
  resolveGlobalHeaderRouteLabel,
  resolveSectionTabs,
} from "../lib/navigation/globalHeader";

describe("global header navigation helpers", () => {
  it("normalizes trailing slash paths", () => {
    assert.equal(normalizePathname("/signals/"), "/signals");
    assert.equal(normalizePathname("/"), "/");
  });

  it("names a route by its page", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/"), "This week");
    assert.equal(resolveGlobalHeaderRouteLabel("/signals/capital-tightness-watch"), "Why it changed");
    assert.equal(resolveGlobalHeaderRouteLabel("/trust"), "How much to trust this week");
    assert.equal(resolveGlobalHeaderRouteLabel("/operate/financial"), "Runway planner");
    assert.equal(resolveGlobalHeaderRouteLabel("/history/compare"), "Compare periods");
    assert.equal(resolveGlobalHeaderRouteLabel("/history/2024"), "Record");
    assert.equal(resolveGlobalHeaderRouteLabel("/concepts"), "Product writing");
    assert.equal(resolveGlobalHeaderRouteLabel("/resources/capital-posture-template"), "Guides");
    assert.equal(resolveGlobalHeaderRouteLabel("/nonexistent"), "Page");
  });

  it("labels utility routes", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/share"), "Use it elsewhere");
    assert.equal(resolveGlobalHeaderRouteLabel("/api-docs"), "API & MCP");
    assert.equal(resolveGlobalHeaderRouteLabel("/about"), "About");
    assert.equal(resolveGlobalHeaderRouteLabel("/about/"), "About");
    // Permanent redirects into /trust; the framework is a section, not a route.
    assert.equal(resolveGlobalHeaderRouteLabel("/threshold"), "Page");
  });

  it("does not match a label on an unrelated path that merely shares a prefix", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/thresholdish"), "Page");
    assert.equal(resolveGlobalHeaderRouteLabel("/historyish"), "Page");
  });

  it("names every public route family rather than falling back to \"Page\"", () => {
    // These families matched nothing, so the header read "Whether · Page" on
    // them — including /brief/<week>, the frozen, citable record.
    assert.equal(resolveGlobalHeaderRouteLabel("/brief/2026-w31"), "Published brief");
    assert.equal(resolveGlobalHeaderRouteLabel("/answers/should-startups-hire-engineers-right-now"), "Answer");
    assert.equal(resolveGlobalHeaderRouteLabel("/resolve/ceo"), "More tools");
    assert.equal(resolveGlobalHeaderRouteLabel("/toolkits/focus"), "Toolkit");
    assert.equal(resolveGlobalHeaderRouteLabel("/contact"), "Contact");
  });

  it("puts every route in the group that owns it", () => {
    const groupOf = (path: string) => findActiveGroup(path)?.key ?? null;
    assert.equal(groupOf("/"), "this-week");
    assert.equal(groupOf("/signals"), "this-week");
    assert.equal(groupOf("/signals/capital-tightness-watch/hiring"), "this-week");
    assert.equal(groupOf("/trust"), "this-week");
    assert.equal(groupOf("/operate"), "decide");
    assert.equal(groupOf("/operate/scenarios"), "decide");
    assert.equal(groupOf("/comps"), "decide");
    assert.equal(groupOf("/history"), "record");
    assert.equal(groupOf("/history/2024-q1"), "record");
    assert.equal(groupOf("/history/compare"), "record");
    assert.equal(groupOf("/calibration"), "record");
    assert.equal(groupOf("/concepts"), "record");
    assert.equal(groupOf("/brief/2026-w31"), "record");
    assert.equal(groupOf("/resources"), "guides");
    assert.equal(groupOf("/resources/reversibility-as-governance"), "guides");
    assert.equal(groupOf("/answers/should-startups-raise-capital-now"), "guides");
    assert.equal(groupOf("/resolve/ceo"), "guides");
    assert.equal(groupOf("/toolkits/focus"), "guides");
    for (const ungrouped of ["/share", "/about", "/api-docs", "/search", "/privacy", "/decisions"]) {
      assert.equal(groupOf(ungrouped), null, `${ungrouped} belongs to no group`);
    }
  });

  it("marks exactly one group active on a grouped route, and none elsewhere", () => {
    const active = (path: string) => resolveGlobalHeaderNavigationLinks(path).filter((link) => link.isActive).map((link) => link.label);
    assert.deepEqual(active("/"), ["This week"]);
    assert.deepEqual(active("/signals"), ["This week"]);
    assert.deepEqual(active("/operate/financial"), ["Decide"]);
    assert.deepEqual(active("/brief/2026-w31"), ["Record"]);
    assert.deepEqual(active("/answers/should-startups-raise-capital-now"), ["Guides"]);
    assert.deepEqual(active("/about"), []);
  });
});

describe("sub-tabs", () => {
  it("draws the group's pages, the current one marked, with Record's cross-links after", () => {
    const record = resolveSectionTabs("/history/compare");
    assert.equal(record?.group.label, "Record");
    assert.deepEqual(
      record?.links.map((link) => [link.label, link.placement, link.isActive]),
      [
        ["Record", "tab", false],
        ["Compare periods", "secondary", true],
        ["Calibration", "tab", false],
        ["Product writing", "secondary", false],
        ["Sources", "cross", false],
        ["How the scores are built", "cross", false],
      ],
    );
  });

  it("marks the brief's own tab on /signals' neighbours, and the plan's tools under Decide", () => {
    assert.deepEqual(
      resolveSectionTabs("/signals")?.links.map((link) => [link.label, link.isActive]),
      [
        ["This week", false],
        ["Why it changed", true],
        ["How much to trust this week", false],
      ],
    );
    assert.deepEqual(
      resolveSectionTabs("/comps")?.links.map((link) => [link.label, link.isActive]),
      [
        ["Decide", false],
        ["Runway planner", false],
        ["Scenarios", false],
        ["SaaS multiples", true],
      ],
    );
  });

  it("draws none for a one-page group or a route outside the groups", () => {
    assert.equal(resolveSectionTabs("/resources"), null);
    assert.equal(resolveSectionTabs("/about"), null);
  });
});
