import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

const mockAny: any = mock;

mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
  }),
}));

mockAny.module("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  },
}));

import { CommandCenterNavBlock, ReportShell } from "../app/components/reportShell";
import * as nextNavigation from "next/navigation";

describe("ReportShell extracted sections", () => {
  it("renders the intro block: kicker, status line, title, summary, stamp, actions", () => {
    const html = renderToStaticMarkup(
      <CommandCenterNavBlock
        pageTitle="Weekly Operating Posture Brief"
        pageSummary="Decision summary"
        recordDateLabel="Mar 5"
        primaryCta={{ href: "/share", label: "Start" }}
        exportCta={{ href: "/operate", label: "Export" }}
        statusLabel="DEFENSIVE"
        trustStatusLabel="HIGH"
        fetchedAtLabel="Mar 6"
        showOfflineBadge={false}
        offlineBadgeLabel="Cached"
      />,
    );

    // No kicker. "Weekly brief" above every H1 restated the route the header
    // tab and the bottom bar already name; the status word leads instead.
    assert.doesNotMatch(html, />Weekly brief</);
    // The status word is the route's stamp: it prints first, in the regime
    // ink, at the reading's own size; the trust headline and the record date
    // follow it in the meta half of the same line.
    assert.match(html, /text-\[color:var\(--regime-ink\)\]">DEFENSIVE<\/span>/);
    assert.match(html, /HIGH • Data as of Mar 5/);
    assert.match(html, /Decision summary/);
    // The refresh stamp is labelled for what it is — the pipeline's fetch,
    // distinct from the reading's record date in the status line above.
    assert.match(html, /Checked Mar 6/);
    assert.match(html, /Start/);
    assert.match(html, /Export/);
  });

  it("omits the refresh stamp when the route has no fetch time", () => {
    // /history describes a record, not a live read, and passes no fetch time.
    // The block printed "Updated " with nothing after it.
    const html = renderToStaticMarkup(
      <CommandCenterNavBlock
        pageTitle="History"
        pageSummary="Past calls, as they were published."
        recordDateLabel="Jul 31, 2026"
        statusLabel="Sunny"
        trustStatusLabel="Historical snapshot"
        fetchedAtLabel=""
        showOfflineBadge={false}
        offlineBadgeLabel="Cached"
      />,
    );

    assert.doesNotMatch(html, /Updated/);
    assert.match(html, /Data as of Jul 31, 2026/);
  });

  it("renders no hero button unless a route asks for one", () => {
    // The shell used to default a primary action to "#weekly-action-summary",
    // an anchor no route renders, so /history shipped a dead button.
    const html = renderToStaticMarkup(
      <ReportShell
        model={{
          status: {
            statusLabel: "DEFENSIVE",
            recordDateLabel: "Mar 5, 2026",
            fetchedAtLabel: "Mar 6, 2026",
          },
          page: {
            pageTitle: "Signals",
            pageSummary: "Deep evidence appendix.",
            sectionLinks: [
              { href: "#current-scores", label: "Current scores" },
              { href: "#thresholds", label: "Thresholds" },
            ],
          },
          trust: {
            trustStatusTone: "stable",
          },
        }}
      >
        <section>Body</section>
      </ReportShell>,
    );

    assert.doesNotMatch(html, /weekly-action-summary/);
    assert.doesNotMatch(html, /This week/);
    assert.doesNotMatch(html, /weather-cta-primary/);
    assert.match(html, /Deep evidence appendix\./);
    // The outline still carries the anchors the hero no longer duplicates.
    assert.match(html, /href="#current-scores"/);
    assert.match(html, /href="#thresholds"/);
  });

  it("keeps a hero action a real link when a route passes one", () => {
    const html = renderToStaticMarkup(
      <ReportShell
        model={{
          status: {
            statusLabel: "DEFENSIVE",
            recordDateLabel: "Mar 5, 2026",
            fetchedAtLabel: "Mar 6, 2026",
          },
          page: {
            pageTitle: "Signals",
            pageSummary: "Deep evidence appendix.",
            sectionLinks: [{ href: "#current-scores", label: "Current scores" }],
          },
          trust: {
            trustStatusTone: "stable",
          },
          actions: {
            primaryCta: { href: "/history/compare", label: "Compare periods" },
          },
        }}
      >
        <section>Body</section>
      </ReportShell>,
    );

    assert.match(html, /href="\/history\/compare"/);
    assert.match(html, /Compare periods/);
    assert.doesNotMatch(html, /Copy aligned brief/);
  });

  it("renders the home brief share action in the header and keeps the body CTA rail quiet", () => {
    const html = renderToStaticMarkup(
      <ReportShell
        model={{
          status: {
            statusLabel: "DEFENSIVE",
            recordDateLabel: "Mar 5, 2026",
            fetchedAtLabel: "Mar 6, 2026",
          },
          page: {
            pageTitle: "Weekly Brief",
            pageSummary: "This week's call and the share-ready path.",
            sectionLinks: [],
          },
          trust: {
            trustStatusTone: "stable",
          },
          actions: {
            exportCta: {
              href: "#share-ready-artifact",
              label: "Copy weekly brief",
              copyText: "WEEKLY BRIEF\nAction: Hold posture.",
              copyTarget: "Weekly brief",
            },
          },
        }}
      >
        <section>Body</section>
      </ReportShell>,
    );

    assert.match(html, /Copy weekly brief/);
    // A copy action is a button (ui-ux-standards §IV): it used to be an anchor
    // to the share section whose click was intercepted, so the markup promised
    // a destination the click never followed.
    assert.match(html, /<button type="button"[^>]*>Copy weekly brief<\/button>/);
    assert.doesNotMatch(html, /href="#share-ready-artifact"/);
    assert.match(html, /share-ready path\./);
    assert.doesNotMatch(html, /Review order/);
  });

  /* No closing "Next" card (2026-10-09): every one pointed at a header tab or at
     /share, which the header and the footer already reach. */
  it("ends on the page's own last section, with no next-step card", () => {
    const html = renderToStaticMarkup(
      <ReportShell
        model={{
          status: {
            statusLabel: "DEFENSIVE",
            recordDateLabel: "Mar 5, 2026",
            fetchedAtLabel: "Mar 6, 2026",
          },
          page: {
            pageTitle: "Plan",
            pageSummary: "Prepare for this week's conditions.",
            sectionLinks: [],
          },
          trust: {
            trustStatusTone: "stable",
          },
        }}
      >
        <section>Body</section>
      </ReportShell>,
    );

    assert.doesNotMatch(html, /next-step-card|aria-label="Next step"/);
    assert.match(html, /<section>Body<\/section>/);
  });
});

/*
 * The intro summary states the page's job; the "On this page" index beneath it
 * names the sections (editorial-guardrails.md -> Headings, ui-ux-standards XI).
 * The 2026-10-04 audit found three summaries that were the index read aloud;
 * these pins keep them from sliding back to enumeration.
 */
describe("report route page summaries", () => {
  it("state the page's job, not the outline beneath them", async () => {
    const signals = await readFile("app/signals/page.tsx", "utf8");
    assert.match(signals, /pageSummary: "The evidence behind this week's guidance."/);
    // The meta description and OG subtitle keep the enumeration: in a search
    // result or social card there is no outline beneath the sentence.
    assert.doesNotMatch(signals, /pageSummary: "What moved/);

    const history = await readFile("app/history/page.tsx", "utf8");
    assert.match(history, /pageSummary: "Look up the guidance for any past month and see how it held up."/);
    assert.doesNotMatch(history, /Historical conditions and the weekly briefs/);

    const plan = await readFile("app/operate/planningPageModel.ts", "utf8");
    assert.match(plan, /pageSummary: "This week's guidance, turned into rules for hiring, spend and the roadmap."/);
    assert.doesNotMatch(plan, /Set the rules, check runway/);
  });
});
