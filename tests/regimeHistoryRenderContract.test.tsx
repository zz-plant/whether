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

  it("returns null for fewer than 2 regimes", () => {
    const html = renderToStaticMarkup(
      <RegimeHistory
        regimes={[{ record_date: "2026-01-01", regime: "EXPANSION" }]}
      />,
    );

    assert.equal(html, "");
  });
});
