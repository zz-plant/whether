import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

const mockAny: any = mock;

mockAny.module("next/navigation", () => ({
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
        resolvedNextRefreshLabel="15m cadence"
        showOfflineBadge={false}
        offlineBadgeLabel="Cached"
      />,
    );

    // One kicker on every report route. "Weekly operating brief" used to appear
    // on whichever routes forgot to ask for the compact variant.
    assert.match(html, /Weekly brief/);
    assert.doesNotMatch(html, /Weekly operating brief/);
    // The status word is the route's stamp: it prints in the regime ink, and
    // the rest of the line stays neutral after it.
    assert.match(html, /text-\[color:var\(--regime-ink\)\][^>]*>DEFENSIVE<\/span> • HIGH • As of Mar 5/);
    assert.match(html, /Decision summary/);
    assert.match(html, /Updated Mar 6/);
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
    assert.match(html, /As of Jul 31, 2026/);
  });

  it("renders no hero button unless a route asks for one", () => {
    // The shell used to default a primary action to "#weekly-action-summary",
    // an anchor no route renders, so /history shipped a dead button.
    const html = renderToStaticMarkup(
      <ReportShell
        statusLabel="DEFENSIVE"
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026"
        pageTitle="Signals"
        pageSummary="Deep evidence appendix."
        sectionLinks={[
          { href: "#current-scores", label: "Current scores" },
          { href: "#thresholds", label: "Thresholds" },
        ]}
        trustStatusTone="stable"
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
        statusLabel="DEFENSIVE"
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026"
        pageTitle="Signals"
        pageSummary="Deep evidence appendix."
        sectionLinks={[{ href: "#current-scores", label: "Current scores" }]}
        trustStatusTone="stable"
        primaryCta={{ href: "/history/compare", label: "Compare periods" }}
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
        statusLabel="DEFENSIVE"
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026"
        pageTitle="Weekly Brief"
        pageSummary="This week's call and the share-ready path."
        sectionLinks={[]}
        trustStatusTone="stable"
        exportCta={{
          href: "#share-ready-artifact",
          label: "Copy weekly brief",
          copyText: "WEEKLY BRIEF\nAction: Hold posture.",
          copyTarget: "Weekly brief",
        }}
      >
        <section>Body</section>
      </ReportShell>,
    );

    assert.match(html, /Copy weekly brief/);
    assert.match(html, /href="#share-ready-artifact"/);
    assert.match(html, /share-ready path\./);
    assert.doesNotMatch(html, /Review order/);
  });

  it("puts the next-step card at the end of the page, once", () => {
    const html = renderToStaticMarkup(
      <ReportShell
        statusLabel="DEFENSIVE"
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026"
        pageTitle="Plan"
        pageSummary="Prepare for this week's conditions."
        sectionLinks={[]}
        trustStatusTone="stable"
        nextStep={{ href: "/resolve", description: "One question still open? Resolve it" }}
      >
        <section>Body</section>
      </ReportShell>,
    );

    assert.equal(html.split('data-testid="next-step-card"').length - 1, 1);
    assert.ok(html.indexOf("Body") < html.indexOf("next-step-card"));
    assert.match(html, /href="\/resolve"/);
  });
});
