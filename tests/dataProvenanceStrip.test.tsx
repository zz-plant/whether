import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DataProvenanceStrip, STATUS_PRESENTATION } from "../app/components/dataProvenanceStrip";
import {
  PROVENANCE_CATALOG_STATUS,
  PROVENANCE_FALLBACK_STATUS,
  PROVENANCE_STATUS,
  type ProvenanceStripStatus,
} from "../lib/report/provenanceStatus";

/*
 * The strip's lookup tables were keyed on five labels nothing produced
 * ("Archived snapshot (high)", "Fallback active (low)", ...). Only "Live" matched
 * a real status, so every other reading rendered a grey tag and a generic
 * "Static · snapshot" chip whatever its tier. Rendered per status, because the
 * claim is about what a reader sees.
 */

const EVERY_STATUS: ProvenanceStripStatus[] = [
  ...Object.values(PROVENANCE_STATUS),
  ...Object.values(PROVENANCE_FALLBACK_STATUS),
  PROVENANCE_CATALOG_STATUS,
];

const render = (statusLabel: ProvenanceStripStatus, variant: "full" | "compact" = "full") =>
  renderToStaticMarkup(
    <DataProvenanceStrip
      variant={variant}
      provenance={{
        sourceLabel: "Federal Reserve Economic Data (FRED)",
        recordDateLabel: "Sep 21, 2026",
        timestampLabel: "Sep 22, 2026 02:00 UTC",
        ageLabel: "6h",
        statusLabel,
      }}
    />,
  );

describe("DataProvenanceStrip", () => {
  for (const status of EVERY_STATUS) {
    for (const variant of ["full", "compact"] as const) {
      it(`renders its own tag and data mode for "${status}" (${variant})`, () => {
        const html = render(status, variant);
        const { tone, dataMode } = STATUS_PRESENTATION[status];

        assert.ok(html.includes(status), "status tag missing");
        assert.ok(html.includes(`weather-tag-${tone}`), `expected ${tone} tag`);
        assert.ok(html.includes(dataMode.label), "data-mode chip missing");
        assert.ok(!html.includes("Static · snapshot"), "generic data-mode fallback");
      });
    }
  }

  it("colours every reading by its tier, and only the catalog neutral", () => {
    for (const status of EVERY_STATUS) {
      assert.equal(
        render(status).includes("weather-tag-slate"),
        status === PROVENANCE_CATALOG_STATUS,
        status,
      );
    }
  });

  it("only calls a live read dynamic", () => {
    for (const status of EVERY_STATUS) {
      assert.equal(
        render(status).includes("weather-data-mode-dynamic"),
        status === PROVENANCE_STATUS.live,
        status,
      );
    }
  });

  it("does not describe the playbook catalog as a replayed reading", () => {
    const html = render(PROVENANCE_CATALOG_STATUS);
    assert.doesNotMatch(html, /Simulated|Replay|archive/i);
    assert.ok(html.includes("Static · curated catalog"));
  });
});
