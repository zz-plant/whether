import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CommandCenterNavBlock,
  HeroTrustProvenanceBlock,
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
        statusLabel="DEFENSIVE"
        fetchedAtLabel="Mar 6, 2026"
        resolvedNextRefreshLabel="15m cadence"
        sourceLabel="FRED"
        sourceHref="https://fred.stlouisfed.org"
      />,
    );

    assert.match(html, /Data provenance/);
    assert.match(html, /Data source details/);
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
    assert.match(html, /Mission control/);
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
});
