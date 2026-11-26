import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  findActiveGroup,
  normalizePathname,
  resolveGlobalHeaderNavigationLinks,
  resolveGlobalHeaderRouteLabel,
  resolveNavigationGroupLinks,
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
    assert.equal(resolveGlobalHeaderRouteLabel("/trust"), "Can I trust this?");
    assert.equal(resolveGlobalHeaderRouteLabel("/operate/financial"), "Runway planner");
    assert.equal(resolveGlobalHeaderRouteLabel("/history/2024"), "History");
    assert.equal(resolveGlobalHeaderRouteLabel("/research/advice-vs-market"), "Advice vs. market");
    assert.equal(resolveGlobalHeaderRouteLabel("/resources/capital-posture-template"), "Guides");
    assert.equal(resolveGlobalHeaderRouteLabel("/nonexistent"), "Page");
  });

  it("labels utility routes", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/share"), "Share and embed");
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
    assert.equal(resolveGlobalHeaderRouteLabel("/contact"), "Contact");
    assert.equal(resolveGlobalHeaderRouteLabel("/privacy"), "Privacy");
    assert.equal(resolveGlobalHeaderRouteLabel("/acceptable-use-policy"), "Acceptable Use");
    assert.equal(resolveGlobalHeaderRouteLabel("/terms-of-service"), "Terms");
  });

  it("puts every route in the group that owns it", () => {
    const groupOf = (path: string) => findActiveGroup(path)?.key ?? null;
    assert.equal(groupOf("/"), "this-week");
    assert.equal(groupOf("/signals"), "this-week");
    assert.equal(groupOf("/signals/capital-tightness-watch/hiring"), "this-week");
    assert.equal(groupOf("/trust"), "this-week");
    assert.equal(groupOf("/operate"), "decide");
    assert.equal(groupOf("/history"), "record");
    assert.equal(groupOf("/history/2024-q1"), "record");
    assert.equal(groupOf("/research/advice-vs-market"), "guides");
    assert.equal(groupOf("/brief/2026-w31"), "record");
    assert.equal(groupOf("/resources"), "guides");
    assert.equal(groupOf("/resources/reversibility-as-governance"), "guides");
    assert.equal(groupOf("/answers/should-startups-raise-capital-now"), "guides");
    for (const ungrouped of ["/share", "/about", "/api-docs", "/search", "/privacy"]) {
      assert.equal(groupOf(ungrouped), null, `${ungrouped} belongs to no group`);
    }
  });

  it("marks exactly one group active on a grouped route, and none elsewhere", () => {
    const active = (path: string) => resolveGlobalHeaderNavigationLinks(path).filter((link) => link.isActive).map((link) => link.label);
    assert.deepEqual(active("/"), ["This week"]);
    assert.deepEqual(active("/signals"), ["This week"]);
    assert.deepEqual(active("/operate/financial"), ["Plan"]);
    assert.deepEqual(active("/brief/2026-w31"), ["History"]);
    assert.deepEqual(active("/about"), []);
  });

  /* Guides left the header on 2026-11-25: the header's tabs leave it out and mark none on
     its pages, and the phone's Menu sheet, which lists every group, marks it. */
  it("draws three groups in the header and all four in the Menu sheet", () => {
    assert.deepEqual(resolveGlobalHeaderNavigationLinks("/").map((link) => link.label), ["This week", "Plan", "History"]);
    assert.deepEqual(resolveNavigationGroupLinks("/").map((link) => link.label), ["This week", "Plan", "History", "Guides"]);
    const answer = "/answers/should-startups-raise-capital-now";
    assert.deepEqual(resolveGlobalHeaderNavigationLinks(answer).filter((link) => link.isActive), []);
    assert.deepEqual(resolveNavigationGroupLinks(answer).filter((link) => link.isActive).map((link) => link.label), ["Guides"]);
  });
});

describe("sub-tabs", () => {
  /* History is one page since 2026-11-25 (the calibration study is a section of it); its
     row stays for the two cross-links into /trust. */
  it("draws the group's pages, the current one marked, with History's cross-links after", () => {
    const record = resolveSectionTabs("/history");
    assert.equal(record?.group.label, "History");
    assert.deepEqual(
      record?.links.map((link) => [link.label, link.placement, link.isActive]),
      [
        ["History", "tab", true],
        ["Is the data current?", "cross", false],
        ["How are the scores worked out?", "cross", false],
      ],
    );
  });

  it("marks the brief's own tab on /signals' neighbours, and the plan's tools under Decide", () => {
    assert.deepEqual(
      resolveSectionTabs("/signals")?.links.map((link) => [link.label, link.isActive]),
      [
        ["This week", false],
        ["Why it changed", true],
        ["Can I trust this?", false],
      ],
    );
    assert.deepEqual(
      resolveSectionTabs("/operate/financial")?.links.map((link) => [link.label, link.isActive]),
      [
        ["Plan", false],
        ["Runway planner", true],
      ],
    );
  });

  it("draws none for a route outside the groups", () => {
    assert.equal(resolveSectionTabs("/about"), null);
  });

  /* Guides was a one-page group, with no row, until Roles and Companies joined it (2026-11-06). */
  it("draws Guides' tabs, and lights Roles on a role's own page", () => {
    assert.deepEqual(
      resolveSectionTabs("/roles/software-engineers")?.links.map((link) => [link.label, link.isActive]),
      [
        ["Guides", false],
        ["Roles", true],
        ["Companies", false],
        ["Advice vs. market", false],
      ],
    );
    assert.equal(resolveSectionTabs("/answers/should-startups-hire-engineers-right-now")?.links.find((link) => link.isActive), undefined);
  });
});
