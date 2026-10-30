import assert from "node:assert/strict";
import { it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrustStrip } from "../app/components/trustStrip";

it("retains every trust fact and label when secondary phone labels are visually compressed", () => {
  const props = {
    recordDateLabel: "Oct 27, 2026", sourcesLive: false, sourcesLabel: "Some sources saved",
    confidenceLabel: "LOW" as const, margin: { signal: "riskAppetite" as const, points: 2 },
    couldChangeNextWeek: true, href: "/trust" as const, phoneLayout: "line" as const,
    basis: { key: "record" as const, value: "The same data we used for past months",
      warning: "Startup-market inputs would put risk appetite below its change line.",
      warningShort: "startup-market inputs left out" },
  };
  const full = renderToStaticMarkup(<TrustStrip {...props} />);
  const compact = renderToStaticMarkup(<TrustStrip {...props} compactLabels />);
  const text = (html: string) => html.replace(/<[^>]*>/g, "");
  assert.equal(text(compact), text(full), "compression changes presentation, never the trust information");
  assert.match(compact, /<dt class="max-sm:sr-only [^"]*">Sources<\/dt>/);
  assert.doesNotMatch(compact, /<dt class="max-sm:sr-only [^"]*">Data as of<\/dt>/);
  assert.match(compact, /Some sources saved/);
  assert.match(compact, /startup-market inputs left out/);
});
