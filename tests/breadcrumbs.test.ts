import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "bun:test";
import {
  buildGroupBreadcrumbs,
  createBreadcrumbTrail,
  getBreadcrumbLabel,
  toVisibleBreadcrumbs,
} from "../lib/navigation/breadcrumbs";
import { isRoute, toRoute } from "../lib/navigation/routeType";

const names = (trail: Array<{ name: string }>) => trail.map((item) => item.name);

describe("breadcrumbs follow the groups", () => {
  it("start a grouped page's trail at its group", () => {
    assert.deepEqual(names(buildGroupBreadcrumbs("/signals")), ["This week", "Why it changed"]);
    assert.deepEqual(names(buildGroupBreadcrumbs("/trust")), ["This week", "Method"]);
    assert.deepEqual(names(buildGroupBreadcrumbs("/operate/financial")), ["Plan", "Runway planner"]);
    assert.deepEqual(names(buildGroupBreadcrumbs("/comps")), ["Plan", "SaaS multiples"]);
    assert.deepEqual(names(buildGroupBreadcrumbs("/history/compare")), ["History", "Compare periods"]);
    assert.deepEqual(names(buildGroupBreadcrumbs("/calibration")), ["History", "Calibration"]);
    assert.deepEqual(names(buildGroupBreadcrumbs("/concepts")), ["History", "Reading list"]);
  });

  it("put Home before a hub, so no trail is one crumb long", () => {
    assert.deepEqual(names(buildGroupBreadcrumbs("/operate")), ["Home", "Plan"]);
    assert.deepEqual(names(buildGroupBreadcrumbs("/history")), ["Home", "History"]);
    assert.deepEqual(names(buildGroupBreadcrumbs("/resources")), ["Home", "Guides"]);
  });

  it("add the caller's crumbs after the group and page", () => {
    assert.deepEqual(
      buildGroupBreadcrumbs("/signals/capital-tightness-watch", [
        { name: "Capital tightness watch", path: "/signals/capital-tightness-watch" },
      ]),
      [
        { name: "This week", path: "/" },
        { name: "Why it changed", path: "/signals" },
        { name: "Capital tightness watch", path: "/signals/capital-tightness-watch" },
      ],
    );
    assert.deepEqual(
      names(buildGroupBreadcrumbs("/answers/should-startups-raise-capital-now", [
        { name: "Should startups raise capital now?", path: "/answers/should-startups-raise-capital-now" },
      ])),
      ["Guides", "Should startups raise capital now?"],
    );
    assert.deepEqual(
      names(buildGroupBreadcrumbs("/brief/2026-w31", [{ name: "Week of Jul 27, 2026", path: "/brief/2026-w31" }])),
      ["History", "Week of Jul 27, 2026"],
    );
    assert.deepEqual(
      names(buildGroupBreadcrumbs("/resolve/ceo", [
        { name: "More tools", path: "/resources#more-tools" },
        { name: "For CEO", path: "/resolve/ceo" },
      ])),
      ["Guides", "More tools", "For CEO"],
    );
  });

  it("draw the current page last and unlinked", () => {
    assert.deepEqual(toVisibleBreadcrumbs(buildGroupBreadcrumbs("/operate/financial")), [
      { label: "Plan", href: "/operate" },
      { label: "Runway planner" },
    ]);
  });

  it("never name a retired tab", () => {
    for (const path of ["/signals", "/operate", "/operate/scenarios", "/trust", "/history", "/history/compare", "/resources"] as const) {
      for (const name of names(buildGroupBreadcrumbs(path))) {
        assert.ok(!["Evidence", "Decide", "Record", "Resolve", "Trust", "Resources"].includes(name), `${path} still says "${name}"`);
      }
    }
  });
});

/*
 * The trails were hand-written per route until 2026-10-08, so "Home › Evidence › …"
 * and "Home › Resolve › Toolkits › …" outlived the tabs they named. Every visible
 * trail on a grouped route reads its group now; /search, outside the groups, keeps
 * Home › Search.
 */
describe("every drawn breadcrumb reads its trail from the groups", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".tsx")) files.push(path);
    }
  };
  walk("app");

  it("builds each trail with buildGroupBreadcrumbs", () => {
    const drawers = files.filter((file) => /<Breadcrumbs\b/.test(readFileSync(file, "utf8")) && !file.endsWith("ui/breadcrumbs.tsx"));
    assert.ok(drawers.length >= 10, `${drawers.length} files draw a breadcrumb`);
    const handWritten = drawers.filter((file) => file !== join("app", "search", "page.tsx") && !readFileSync(file, "utf8").includes("buildGroupBreadcrumbs("));
    assert.deepEqual(handWritten, [], "a hand-written trail keeps the old tab names when a group is renamed");
  });
});

describe("explicit trails for the pages outside the groups", () => {
  it("keeps Home as the root label and names pages from the IA", () => {
    assert.equal(getBreadcrumbLabel("/"), "Home");
    assert.equal(getBreadcrumbLabel("/signals"), "Why it changed");
    assert.deepEqual(createBreadcrumbTrail([{ path: "/" }, { path: "/about", label: "About" }]), [
      { name: "Home", path: "/" },
      { name: "About", path: "/about" },
    ]);
  });

  it("formats unmapped slug segments into title case", () => {
    assert.equal(getBreadcrumbLabel("/toolkits/growth-efficiency"), "Growth Efficiency");
  });

  it("validates route paths at runtime instead of asserting them", () => {
    assert.equal(isRoute("/operate"), true);
    assert.equal(isRoute("operate"), false);
    assert.equal(toRoute("/operate?x=1"), "/operate?x=1");
    assert.throws(() => toRoute("operate"));
  });
});
