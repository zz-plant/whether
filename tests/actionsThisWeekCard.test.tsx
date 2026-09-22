import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ActionsThisWeekCard } from "../app/components/hero/ActionsThisWeekCard";

/*
 * The card used to carry three invented default actions, rendered whenever the
 * model passed an empty list, linking to `/operate#hiring`, `#spend` and
 * `#roadmap` — ids no route renders. An empty list renders nothing now, and the
 * rows are an ordered list rather than a numbered well inside a bordered row.
 */
describe("ActionsThisWeekCard", () => {
  it("renders nothing when the model hands it no actions", () => {
    assert.equal(renderToStaticMarkup(<ActionsThisWeekCard actions={[]} />), "");
  });

  it("numbers the actions as an ordered list without a frame per row", () => {
    const html = renderToStaticMarkup(
      <ActionsThisWeekCard
        actions={[
          { id: 1, text: "Hold offers behind the close.", href: "/operate#ops-hiring" },
          { id: 2, text: "Re-approve discretionary spend." },
        ]}
        operateHref="/operate"
      />,
    );

    assert.match(html, /<ol[^>]*list-decimal/);
    assert.equal((html.match(/<li\b/g) ?? []).length, 2);
    assert.match(html, /href="\/operate#ops-hiring"/);
    assert.match(html, /href="\/operate"/, "a row without its own target links to the plan");
    assert.doesNotMatch(html, /Recheck fixed-cost|#hiring"|#spend"|#roadmap"/, "no invented default action survives");
    assert.doesNotMatch(html, /h-7 w-7|rounded-xl border/, "no numbered well or per-row card");
  });

  it("copies through the shared clipboard row", () => {
    const html = renderToStaticMarkup(
      <ActionsThisWeekCard actions={[{ id: 1, text: "Hold offers behind the close." }]} />,
    );

    assert.match(html, /class="weather-button[^"]*"[^>]*>[\s\S]*?Copy list/);
    assert.match(html, /<output[^>]*aria-live="polite"/, "the copy result still reaches a screen reader");
  });
});
