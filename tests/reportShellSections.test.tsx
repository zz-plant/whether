import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CommandCenterNavBlock,
  HeroTrustProvenanceBlock,
  ReportShell,
  SidebarSequenceBlock,
  resolveTrustProvenance,
} from "../app/components/reportShell";

describe("ReportShell extracted sections", () => {
  it("renders hero trust and provenance block", () => {
    const html = renderToStaticMarkup(
      <HeroTrustProvenanceBlock
        trustStatusTone="stable"
        trustStatusLabel="HIGH"
        trustStatusDetail="Stable feed"
        trustStatusAction="Proceed with planning"
        outageType="live-data"
        outageSeverity="advisory"
        decisionImpactWindow="Live window: safe for approvals."
        approvalBuckets={[
          { label: "Allowed now", detail: "Proceed with standard approvals." },
          { label: "Hold", detail: "None." },
          { label: "Blocked", detail: "None." },
        ]}
        recoveryPlan={{
          owner: "CEO + Finance lead",
          nextCheckpoint: "Weekly planning cadence",
          exitCondition: "Keep standard approvals while confidence remains above LOW.",
        }}
        outageExitGate={{
          label: "Outage mode exits when 3/3 checks pass.",
          summary: "3/3 checks passed this refresh.",
          metCount: 3,
          totalCount: 3,
        }}
        statusLabel="DEFENSIVE"
        fetchedAtLabel="Mar 6, 2026"
        resolvedNextRefreshLabel="15m cadence"
        sourceLabel="FRED"
        sourceHref="https://fred.stlouisfed.org"
      />,
    );

    assert.match(html, /Data trust/);
    assert.match(html, /Approval lane/);
    assert.match(html, /Reliability snapshot/);
    assert.match(html, /Data source details/);
    assert.match(html, /\/method/);
  });

  it("prefers canonical treasury source attribution when provenance is present", () => {
    const resolved = resolveTrustProvenance({
      sourceLabel: "Treasury Fiscal Data",
      sourceHref: "https://fiscaldata.treasury.gov",
      provenance: {
        sourceLabel: "Federal Reserve Economic Data (FRED)",
        sourceUrl: "https://fred.stlouisfed.org",
        recordDateLabel: "Mar 5, 2026",
        timestampLabel: "Mar 6, 2026 10:15 UTC",
        ageLabel: "2h ago",
        statusLabel: "Cached (medium)",
      },
    });

    assert.ok(resolved);
    assert.equal(resolved.sourceLabel, "Treasury Fiscal Data");
    assert.equal(resolved.sourceUrl, "https://fiscaldata.treasury.gov");
  });

  it("renders command center/nav block", () => {
    const html = renderToStaticMarkup(
      <CommandCenterNavBlock
        heroVariant="full"
        pageTitle="Weekly Operating Posture Brief"
        pageSummary="Decision summary"
        summaryLink={null}
        recordDateLabel="Mar 5"
        primaryCta={{ href: "#weekly", label: "Start" }}
        secondaryCta={{ href: "#evidence", label: "Evidence" }}
        exportCta={{ href: "/operations", label: "Export" }}
        statusLabel="DEFENSIVE"
        trustStatusLabel="HIGH"
        fetchedAtLabel="Mar 6"
        resolvedNextRefreshLabel="15m cadence"
        trustStatusAction="Proceed"
        showOfflineBadge={false}
        offlineBadgeLabel="Cached"
        missionSupportText="Stable feed"
        missionSequenceTitle="Planning sequence"
        missionSequenceItems={[{ title: "Now", detail: "Act", href: "#", cta: "Do", phase: "Now" }]}
      />,
    );

    assert.match(html, /Whether report/);
    assert.match(html, /Decide now/);
    assert.match(html, /Review order/);
    assert.match(html, /Start/);
    assert.match(html, /Planning sequence/);
  });

  it("renders sidebar sequence rail", () => {
    const html = renderToStaticMarkup(
      <SidebarSequenceBlock
        stageRail={{
          title: "Decision flow",
          items: [{ id: "one", label: "Call", href: "#call", status: "current" }],
        }}
      />,
    );

    assert.match(html, /Decision flow/);
    assert.match(html, /Call/);
  });

  it("keeps in-page hero actions as actual links when they target report sections", () => {
    const html = renderToStaticMarkup(
      <ReportShell
        statusLabel="DEFENSIVE"
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026"
        treasurySource="https://fred.stlouisfed.org"
        pageTitle="Signals"
        pageSummary="Deep evidence appendix."
        pageSummaryLink={{ href: "#thresholds", label: "See thresholds" }}
        sectionLinks={[
          { href: "#current-scores", label: "Current scores" },
          { href: "#thresholds", label: "Thresholds" },
        ]}
        trustStatusLabel="HIGH"
        trustStatusDetail="Stable feed"
        trustStatusAction="Proceed with planning."
        trustStatusTone="stable"
        currentPath="/signals"
        primaryCta={{ href: "#current-scores", label: "Open evidence appendix" }}
        secondaryCta={{ href: "#thresholds", label: "See thresholds" }}
        exportCta={{ href: "#ops-export-briefs", label: "Copy aligned brief" }}
      >
        <section>Body</section>
      </ReportShell>,
    );

    assert.match(html, /href="#current-scores"/);
    assert.match(html, /href="#thresholds"/);
    assert.match(html, /href="#ops-export-briefs"/);
    assert.match(html, /Open evidence appendix/);
    assert.match(html, /See thresholds/);
    assert.match(html, /Copy aligned brief/);
    assert.match(html, /Deep evidence appendix\./);
  });

  it("renders the home brief share action in the header and keeps the body CTA rail quiet", () => {
    const html = renderToStaticMarkup(
      <ReportShell
        statusLabel="DEFENSIVE"
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026"
        treasurySource="https://fred.stlouisfed.org"
        pageTitle="Weekly Brief"
        pageSummary="This week's call and the share-ready path."
        sectionLinks={[]}
        trustStatusLabel="HIGH"
        trustStatusDetail="Stable feed"
        trustStatusAction="Proceed with planning."
        trustStatusTone="stable"
        currentPath="/"
        headerVariant="home-brief"
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
    assert.match(html, /Decide this week&#x27;s pace in one screen\./);
    assert.doesNotMatch(html, /Review order/);
  });
});
