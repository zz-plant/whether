import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { isValidElement } from "react";
import * as nextNavigation from "next/navigation";

/* The share page's format picker and the brief's subscribe form read the router. Spread,
   so the next file still gets the real module's other exports. */
const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/*
 * Until 2026-10-08 the site offered to share one week in five places: the brief's "Do
 * and share" slide and image buttons, the plan's "Share the brief" step, Trust's "Cite
 * this guidance" and "Meeting snippet", /share itself, and each frozen week's own copy
 * panel. /share holds every format now. The brief, Decide and Trust each carry one
 * "Share or embed this →" link instead; a frozen week keeps its date-pinned panel,
 * because /share carries the current week and cannot copy a past one.
 */

const LINK_TEXT = "Share or embed this →";
const shareLinksIn = (html: string) =>
  [...html.matchAll(/<a\b[^>]*href="\/share"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => match[1].replace(/<[^>]+>/g, "").trim());

describe("one way out to /share from each reading page", () => {
  it("the brief's Share section links to /share instead of copying the slide and the card itself", async () => {
    const { ShareSection } = await import("../app/components/home/ShareSection");
    const html = renderToStaticMarkup(<ShareSection currentRecordDate="2026-09-28" currentRecordDateLabel="Sep 28, 2026" />);
    assert.deepEqual(shareLinksIn(html), [LINK_TEXT]);
    const source = readFileSync("app/components/home/ShareSection.tsx", "utf8");
    assert.doesNotMatch(source, /CopyMeetingSlideButton|CopyImageCardButton/, "the copy buttons live on /share");
  });

  it("Decide has no share step and hands off to /share in its next-step card", async () => {
    const { buildPlanningPageModel } = await import("../app/operate/planningPageModel");
    const { reportShellModel } = await buildPlanningPageModel();
    assert.deepEqual(reportShellModel.actions?.nextStep && [reportShellModel.actions.nextStep.href, reportShellModel.actions.nextStep.label], ["/share", LINK_TEXT]);
    const source = readFileSync("app/operate/planningPageModel.ts", "utf8");
    assert.doesNotMatch(source, /id: "ops-export-briefs"|BriefIslandPicker/, "the share step is gone");
  });

  it("Trust drops the citation and the meeting snippet for one link to /share", async () => {
    const html = renderToStaticMarkup(await (await import("../app/trust/page")).default({}));
    assert.ok(!html.includes('id="sources-freshness"'), "no Cite this guidance section");
    assert.ok(!html.includes('id="meeting-snippet"'), "no Meeting snippet section");
    assert.deepEqual(shareLinksIn(html), [LINK_TEXT]);
  });

  it("a frozen week keeps its own date-pinned copy panel and adds no /share link", () => {
    const source = readFileSync("app/brief/[week]/page.tsx", "utf8");
    assert.match(source, /<PublishedBriefCopyControls/);
    assert.doesNotMatch(source, /ShareOrEmbedLink|href="\/share"/);
  });
});

describe("/share holds what the other pages stopped carrying", () => {
  it("offers the meeting snippet beside the citation, and the slide and card clipboard buttons", async () => {
    const page = await import("../app/share/page");
    const optionIds: string[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!isValidElement<{ options?: Array<{ id: string }>; children?: unknown }>(node)) return;
      node.props.options?.forEach((option) => optionIds.push(option.id));
      walk(node.props.children);
    };
    walk(await page.default());
    assert.ok(optionIds.includes("meeting-snippet"), "the meeting snippet is a format");
    assert.ok(optionIds.includes("citation"), "the citation is a format");
    const files = readFileSync("app/share/shareImageArtifacts.tsx", "utf8");
    assert.match(files, /<CopyMeetingSlideButton \/>/);
    assert.match(files, /<CopyImageCardButton \/>/);
  });

  it("links the API, MCP and RSS from /share", async () => {
    const source = readFileSync("app/share/page.tsx", "utf8");
    assert.match(source, /apiLink/);
    assert.match(source, /\/feed\.xml/);
  });
});
