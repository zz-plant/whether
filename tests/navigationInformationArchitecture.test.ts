import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import {
  contentSections,
  headerUtilityLinks,
  navigationGroupByKey,
  navigationGroups,
  navigationLabelByPath,
  navigationPages,
  pagesInGroup,
  utilityLinks,
} from "../lib/navigation/informationArchitecture";
import { pathMatchesLink } from "../lib/navigation/pathMatching";

/*
 * The 2026-10-08 regrouping: four groups in the header — This week, Decide,
 * Record, Guides — each with a hub and its own pages, and the utility links
 * (Use it elsewhere, About) beside them rather than in a More menu.
 */
describe("navigation groups", () => {
  it("puts four groups in the header, in this order, each on its hub", () => {
    assert.deepEqual(
      navigationGroups.map((group) => [group.label, group.href]),
      [
        ["This week", "/"],
        ["Decide", "/operate"],
        ["Record", "/history"],
        ["Guides", "/resources"],
      ],
    );
  });

  it("gives every group a distinct one-key jump that no other shortcut binds", () => {
    const keys = navigationGroups.map((group) => group.shortcut);
    assert.equal(new Set(keys).size, keys.length);
    // C copies the brief, F toggles focus, J and K move between sections, S (with
    // shift) opens the share rail, / and ? are search and help.
    for (const key of keys) {
      assert.ok(!["c", "f", "j", "k", "s", "/", "?"].includes(key), `${key} is already bound`);
    }
  });

  it("keeps each group's pages in order, hub first", () => {
    assert.deepEqual(
      Object.fromEntries(navigationGroups.map((group) => [group.key, pagesInGroup(group.key).map((page) => page.href)])),
      {
        "this-week": ["/", "/signals", "/trust"],
        decide: ["/operate", "/operate/financial", "/operate/scenarios", "/comps"],
        record: ["/history", "/calibration", "/history/compare", "/concepts"],
        guides: ["/resources"],
      },
    );
    for (const group of navigationGroups) {
      assert.equal(pagesInGroup(group.key)[0]?.href, group.href, `${group.label}'s first page is its hub`);
    }
  });

  it("names a group's hub page by the group's name, so one address has one name", () => {
    for (const group of navigationGroups) {
      const hub = navigationPages.find((page) => page.href === group.href);
      assert.equal(hub?.label, group.label, `${group.href} is "${group.label}" in the header and "${hub?.label}" below it`);
    }
  });

  it("calls /signals 'Why it changed' and /trust 'How much to trust this week'", () => {
    assert.equal(navigationLabelByPath["/signals"], "Why it changed");
    assert.equal(navigationLabelByPath["/trust"], "How much to trust this week");
  });

  it("files Product writing under Record as a secondary page, not a tab", () => {
    const concepts = navigationPages.find((page) => page.href === "/concepts");
    assert.equal(concepts?.group, "record");
    assert.equal(concepts?.placement, "secondary");
    assert.ok(!utilityLinks.some((link) => String(link.href) === "/concepts"), "not a utility link");
  });

  it("files SaaS multiples under Decide", () => {
    assert.equal(navigationPages.find((page) => page.href === "/comps")?.group, "decide");
  });

  it("reaches the sources and the score derivation on /trust from Record", () => {
    assert.deepEqual(
      navigationGroupByKey.record.crossLinks.map((link) => link.href),
      ["/trust#source-board", "/trust#formula-reference"],
    );
  });

  /*
   * One URL, one name. `/history/compare` was "Compare periods" in the loop and
   * "Macro Analogs" in the utility row, and later "Compare" and "Compare periods"
   * side by side in the footer.
   */
  it("gives each route exactly one label across every navigation surface", () => {
    const labelsByPath = new Map<string, Set<string>>();
    for (const entry of [...navigationGroups, ...navigationPages, ...utilityLinks]) {
      const path = entry.href.split(/[#?]/)[0];
      if (!labelsByPath.has(path)) labelsByPath.set(path, new Set());
      labelsByPath.get(path)!.add(entry.label);
    }

    const conflicts = [...labelsByPath.entries()]
      .filter(([, labels]) => labels.size > 1)
      .map(([path, labels]) => `${path} is called ${[...labels].map((l) => `"${l}"`).join(" and ")}`);

    assert.deepEqual(conflicts, [], `\n${conflicts.join("\n")}\n`);
  });

  it("lists no page twice", () => {
    const hrefs = navigationPages.map((page) => page.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });

  it("matches legacy aliases for the active tab", () => {
    assert.ok(pathMatchesLink("/signals", "/evidence"));
    assert.ok(pathMatchesLink("/signals", "/evidence/capital-tightness-watch"));
    assert.ok(pathMatchesLink("/operate", "/planning"));
    assert.ok(pathMatchesLink("/operate", "/planning/financial"));
    assert.ok(!pathMatchesLink("/resources", "/resolve"), "Resolve is a redirect, not an alias");
  });
});

describe("utility links", () => {
  it("draws Use it elsewhere and About in the header, not behind a menu", () => {
    assert.deepEqual(
      headerUtilityLinks.map((link) => [link.label, link.href]),
      [
        ["Use it elsewhere", "/share"],
        ["About", "/about"],
      ],
    );
  });

  /* Until 2026-10-23 no page, nav or palette linked /contact — only the sitemap
     named it. The footer brand row, the phone's More sheet and the palette all
     render this array, so membership is reachability. */
  it("keeps Contact reachable from the footer, the sheet and the palette", () => {
    const contact = utilityLinks.find((link) => link.href === "/contact");
    assert.ok(contact, "/contact is in the utility links");
    assert.equal(contact.header, null, "the header's text row does not carry it");
  });

  it("leaves no page in a utility link that a group already owns", () => {
    const grouped = new Set<string>(navigationPages.map((page) => page.href));
    for (const link of utilityLinks) {
      assert.ok(!grouped.has(link.href), `${link.href} is a grouped page and a utility link`);
    }
  });
});

/*
 * The footer used to hand-list its own copy of the utility row. The copies
 * drifted, and a utility page ended up in the IA but not in the footer,
 * reachable solely from a header dropdown.
 */
describe("footer mirrors the groups and the utility links", () => {
  const source = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  // The footer only: the <head> prefetches /operate and /signals by address, on purpose.
  const layout = source.slice(source.indexOf("<footer"), source.indexOf("</footer>"));

  it("renders the groups and the utility links from the IA rather than restating them", () => {
    assert.match(layout, /navigationGroups\.map\(/);
    assert.match(layout, /pagesInGroup\(group\.key\)/);
    assert.match(layout, /utilityLinks\.map\(/);
    for (const entry of [...utilityLinks, ...navigationPages]) {
      if (entry.href === "/") continue;
      assert.doesNotMatch(layout, new RegExp(`href="${entry.href}"`), `${entry.href} is hard-coded in the footer`);
    }
  });

  it("keeps every indexable linked page in the sitemap", () => {
    const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
    // /search is deliberately noindex, so it is deliberately not in the sitemap. The two
    // workstreams are submitted from WORKSTREAMS, not as string literals.
    const indexable = [...utilityLinks, ...navigationPages]
      .map((entry) => entry.href)
      .filter((href) => href !== "/search" && href !== "/" && !href.startsWith("/operate/"));

    for (const href of indexable) {
      assert.ok(sitemap.includes(`"${href}"`), `${href} is linked in the navigation but missing from the sitemap`);
    }
  });
});

/*
 * The header used to keep a private list of route families that no layer or
 * utility link claimed, which is how it came to read "Whether · Page" on the
 * citable weekly record. The IA module owns that list now.
 */
describe("content sections", () => {
  it("names every routed content family the pages and utilities do not", () => {
    const named = new Set<string>(contentSections.map((section) => section.prefix));
    for (const prefix of ["/answers", "/brief", "/resolve", "/toolkits"]) {
      assert.ok(named.has(prefix), `${prefix} must be a named content section`);
    }
    // Contact is a utility link since 2026-10-23, so it reaches the footer, the
    // phone sheet and the palette from the one array instead of being named
    // only in the header's sublabel.
    assert.ok(!named.has("/contact"), "/contact is a utility link, not a content section");
  });

  it("does not overlap a page or a utility link", () => {
    const claimed = new Set<string>([...navigationPages.map((page) => page.href), ...utilityLinks.map((link) => link.href)]);
    for (const section of contentSections) {
      assert.equal(claimed.has(section.prefix), false, `${section.prefix} is claimed twice`);
    }
  });

  it("keeps the header out of the business of naming routes", () => {
    const header = readFileSync(new URL("../lib/navigation/globalHeader.ts", import.meta.url), "utf8");
    assert.doesNotMatch(header, /sectionRouteLabels/, "the private fallback list is gone");
    assert.match(header, /contentSections/);
  });
});
