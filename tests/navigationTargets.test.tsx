import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { isValidElement } from "react";
import * as nextNavigation from "next/navigation";

import { answerPages } from "../app/answers/decisionPages";
import { ToolkitLibraryPanels } from "../app/resources/components/toolkitLibraryPanels";
import { resolveSearchCommandHref, SEARCH_JOB_ORDER } from "../app/search/searchCommand";
import { navigationGroups } from "../lib/navigation/informationArchitecture";
import { resourcePillarPages } from "../lib/resourcesContent";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/* The answer page's copy button reads the router. Spread, so the next file still gets the real module's other exports. */
const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * A docs audit on 2026-10-06 found the site still pointing readers at things the
 * IA had renamed or removed. Three links went to `#unresolved-question-router`, a
 * /resolve section that `#direct-answers` replaced; `/sources` redirected to
 * `#sources-freshness`, the id the "Cite this guidance" block kept when the source
 * list moved to `#source-board`; and the 404 page, the answer pages and the resource
 * CTAs still called Plan "Planning" and Resolve "Decision Tools". Each link worked:
 * an anchor that misses lands at the top of the page, and a stale label still
 * clicks through. So these render the pages and read where the links go.
 */

type RedirectPair = [source: string, destination: string];
type RedirectPairsModule = Record<
  "canonicalSurfaceRedirectPairs" | "solutionRedirectPairs" | "iaConsolidationRedirectPairs",
  RedirectPair[]
>;
const require = createRequire(import.meta.url);
const redirectTables: RedirectPairsModule = require("../next.config.js");
const redirectPairs = [
  ...redirectTables.solutionRedirectPairs,
  ...redirectTables.canonicalSurfaceRedirectPairs,
  ...redirectTables.iaConsolidationRedirectPairs,
];

const renderGuides = async () => renderToStaticMarkup(await (await import("../app/resources/page")).default({}));
/* Decide's ids from its page model rather than a render: the stepper is a client
   component that needs the toast provider, and a step's id (and its aliases) is what
   a link into it names. */
const decideIds = async () => {
  const { buildPlanningPageModel } = await import("../app/operate/planningPageModel");
  const { children } = await buildPlanningPageModel();
  const ids = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!isValidElement<{ id?: string; children?: unknown; steps?: Array<{ id: string; hashAliases?: string[]; children?: unknown }> }>(node)) return;
    if (node.props.id) ids.add(node.props.id);
    for (const step of node.props.steps ?? []) {
      ids.add(step.id);
      step.hashAliases?.forEach((alias) => ids.add(alias));
      walk(step.children);
    }
    walk(node.props.children);
  };
  walk(children);
  return ids;
};
const renderTrust = async () => renderToStaticMarkup(await (await import("../app/trust/page")).default({}));
const renderAnswer = async () => {
  const { DecisionAnswerPageContent } = await import("../app/answers/decisionAnswerPageContent");
  const slug = answerPages[0].slug;
  return renderToStaticMarkup(await DecisionAnswerPageContent({ slug, route: `/answers/${slug}` }));
};
const renderResource = async (slug: string) =>
  renderToStaticMarkup(await (await import("../app/resources/[slug]/page")).default({ params: Promise.resolve({ slug }) }));

const idsIn = (html: string) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));

/** Every `/resources#…`, `/operate#…` and `/trust#…` href in the markup, query string allowed. */
const anchoredHrefsIn = (html: string) =>
  [...html.matchAll(/href="(\/(?:resources|operate|trust)(?:\?[^"#]*)?#[^"]+)"/g)].map((match) => match[1].replace(/&amp;/g, "&"));

/** Every link in the markup, as its href and the words it shows. */
const linksIn = (html: string) =>
  [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => ({
    href: match[1],
    text: match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  }));

/* /resolve folded into Decide and Guides on 2026-10-08; the anchors it owned are Guides'
   (#answers, #more-tools, #guided-translation, #toolkit-library) and Decide's
   (#ops-decision-shield). */
describe("links into Guides, Decide and /trust land on a section the page draws", () => {
  it("names only ids the target page renders, from the redirects, the answer pages, the toolkit search and /search", async () => {
    const renderedIds: Record<string, Set<string>> = {
      "/resources": idsIn(await renderGuides()),
      "/operate": await decideIds(),
      "/trust": idsIn(await renderTrust()),
    };

    const links: Array<{ from: string; href: string }> = [
      ...redirectPairs
        .filter(([, destination]) => /^\/(resources|operate|trust)(\?|#)/.test(destination) && destination.includes("#"))
        .map(([source, destination]) => ({ from: `redirect ${source}`, href: destination })),
      ...anchoredHrefsIn(await renderAnswer()).map((href) => ({ from: "an answer page", href })),
      // A query nothing matches: the panel's empty state is where the dead chip was.
      ...anchoredHrefsIn(renderToStaticMarkup(<ToolkitLibraryPanels query="zzqx" />)).map((href) => ({
        from: "toolkit search with no match",
        href,
      })),
      ...SEARCH_JOB_ORDER.flatMap((job) => {
        const href = resolveSearchCommandHref("zzqx", [], job);
        return href && /^\/(resources|operate|trust)[?#]/.test(href) ? [{ from: `/search "go straight there" (${job})`, href }] : [];
      }),
    ];

    assert.ok(links.some((link) => link.from === "redirect /sources"), "the /sources redirect is among those checked");
    const missing = links.filter(({ href }) => {
      const [path] = href.split(/[?#]/);
      const fragment = href.slice(href.indexOf("#") + 1);
      return !renderedIds[path]?.has(fragment);
    });
    assert.deepEqual(
      missing.map(({ from, href }) => `${from} → ${href}`),
      [],
      "an anchor the page does not render lands the reader at the top of it",
    );
  });

  it("sends /sources to the list of sources, not to the citation block", async () => {
    const destination = redirectPairs.find(([source]) => source === "/sources")?.[1] ?? "";
    assert.ok(destination.startsWith("/trust#"), `/sources goes to a /trust section (got "${destination}")`);

    const html = await renderTrust();
    const start = html.indexOf(`id="${destination.slice("/trust#".length)}"`);
    const next = html.indexOf("<section", start + 1);
    const section = html.slice(start, next === -1 ? undefined : next);
    assert.match(section, /data-source-row=/, "the section /sources lands on lists each source");
  });
});

describe("links into Plan and Resolve use the names the header prints", () => {
  /* Substring bans would catch task phrases ("Build this week's plan") that
     legitimately use a common noun, so these match the whole label. */
  const RETIRED: Array<{ path: string; name: RegExp }> = [
    { path: "/operate", name: /\bPlanning\b/ },
    { path: "/operate", name: /^Decide$/ },
    { path: "/history", name: /^Record$/ },
    { path: "/resolve", name: /\bDecision Tools\b/ },
    { path: "/signals", name: /^Evidence$/ },
    { path: "/trust", name: /^Trust$/ },
  ];

  const renderResolve = async (slug: string) => {
    const ResolvePage = (await import("../app/resolve/[slug]/page")).default;
    return renderToStaticMarkup(await ResolvePage({ params: Promise.resolve({ slug }) }));
  };

  it("on the 404 page, an answer page, the resource pages, the search dead end and the role guides", async () => {
    const NotFound = (await import("../app/not-found")).default;
    const DecisionShieldOverview = (await import("../app/resources/decision-shield-overview/page")).default;
    const { decideStaticParams } = await import("../lib/decisionDomainCatalog");
    const { SearchResults } = await import("../app/search/searchResults");
    const resolveSlug = decideStaticParams.at(0)?.slug;
    assert.ok(resolveSlug, "the decision catalog carries at least one resolve slug");
    const surfaces: Array<{ name: string; html: string }> = [
      { name: "/404", html: renderToStaticMarkup(<NotFound />) },
      { name: `/answers/${answerPages[0].slug}`, html: await renderAnswer() },
      { name: "/resources/decision-shield-overview", html: renderToStaticMarkup(await DecisionShieldOverview()) },
      { name: "/resources/capital-posture-template", html: await renderResource("capital-posture-template") },
      { name: `/resources/${resourcePillarPages[0].slug}`, html: await renderResource(resourcePillarPages[0].slug) },
      /* The empty state hand-listed "Evidence", "Plan", "Toolkit library" and
         "Trust" until 2026-10-23 — the recovery surface is the one place a
         reader cannot afford a name the header no longer prints. */
      { name: "/search (nothing matched)", html: renderToStaticMarkup(<SearchResults initialQuery="zzqx-no-such-entry" />) },
      { name: `/resolve/${resolveSlug}`, html: await renderResolve(resolveSlug) },
    ];

    const stale = surfaces.flatMap(({ name, html }) =>
      linksIn(html).flatMap(({ href, text }) =>
        RETIRED.filter(({ path, name: retired }) => (href === path || href.startsWith(`${path}#`) || href.startsWith(`${path}?`)) && retired.test(text)).map(
          () => `${name}: "${text}" → ${href}`,
        ),
      ),
    );
    assert.deepEqual(stale, [], `\n${stale.join("\n")}\n`);
  });

  it("offers every group in the header on the 404 page, by its IA label", async () => {
    const NotFound = (await import("../app/not-found")).default;
    const links = linksIn(renderToStaticMarkup(<NotFound />));
    for (const group of navigationGroups) {
      assert.ok(
        links.some((link) => link.href === group.href && link.text === group.label),
        `the 404 page links ${group.href} as "${group.label}"`,
      );
    }
  });
});
