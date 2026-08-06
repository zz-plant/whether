import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportSectionNavigation } from "../app/components/reportShellNavigation";

describe("Report section navigation", () => {
  it("renders in-page section links as the lightweight index", () => {
    const html = renderToStaticMarkup(
      <ReportSectionNavigation
        sectionLinks={[
          { href: "#decision-summary", label: "Decision summary" },
          { href: "#current-scores", label: "Current scores" },
          { href: "#advanced-controls", label: "Advanced controls" },
        ]}
      />,
    );

    assert.match(html, /href="#current-scores"/);
    assert.match(html, /Current scores/);
    assert.match(html, /Advanced controls/);
  });
});
