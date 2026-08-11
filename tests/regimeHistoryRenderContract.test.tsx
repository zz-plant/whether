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

import { RegimeHistory } from "../app/components/RegimeHistory";
import { REGIME_DISPLAY } from "../app/viewModel";

describe("RegimeHistory render contract", () => {
  it("renders bars for each regime entry", () => {
    const html = renderToStaticMarkup(
      <RegimeHistory
        regimes={[
          { record_date: "2025-01-01", regime: "EXPANSION" },
          { record_date: "2025-06-01", regime: "DEFENSIVE" },
          { record_date: "2026-01-01", regime: "SCARCITY" },
        ]}
      />,
    );

    assert.match(html, /2025/);
    assert.match(html, /Conditions over time/);
  });

  it("names each regime present in the window in a legend (hue alone cannot carry the regime)", () => {
    const html = renderToStaticMarkup(
      <RegimeHistory
        regimes={[
          { record_date: "2025-01-01", regime: "EXPANSION" },
          { record_date: "2025-06-01", regime: "DEFENSIVE" },
          { record_date: "2026-01-01", regime: "SCARCITY" },
        ]}
      />,
    );

    for (const regime of ["EXPANSION", "DEFENSIVE", "SCARCITY"]) {
      assert.ok(
        html.includes(REGIME_DISPLAY[regime]),
        `legend should name ${REGIME_DISPLAY[regime]}`,
      );
    }
    // VOLATILE never appears in this window, so the legend must not list it.
    assert.ok(!html.includes(REGIME_DISPLAY.VOLATILE), "legend lists only regimes present");
  });

  it("returns null for fewer than 2 regimes", () => {
    const html = renderToStaticMarkup(
      <RegimeHistory
        regimes={[{ record_date: "2026-01-01", regime: "EXPANSION" }]}
      />,
    );

    assert.equal(html, "");
  });
});
