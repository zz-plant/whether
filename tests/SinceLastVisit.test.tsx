import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  SinceLastVisit,
  elapsedWeeksSuffix,
  compareHrefForRecordDate,
} from "../app/components/home/SinceLastVisit";

/*
 * The comparison itself renders only after hydration, from localStorage, and
 * this suite has no DOM: `renderToStaticMarkup` takes the store's server
 * snapshot. So the render test pins the half that matters for hydration — the
 * server markup is the fallback, never a note — and the elapsed label is
 * tested as the function the note prints.
 */
describe("SinceLastVisit", () => {
  const current = {
    recordDate: "2026-09-21",
    recordDateLabel: "Sep 21, 2026",
    regimeLabel: "Breezy",
    call: "Protect cash, selective risk",
  };

  it("server-renders the fallback, so hydration never starts from a note", () => {
    const markup = renderToStaticMarkup(
      createElement(SinceLastVisit, {
        current,
        fallback: createElement("span", { "data-testid": "empty-fallback" }, "First visit"),
      }),
    );

    assert.ok(markup.includes('data-testid="empty-fallback"'));
    assert.ok(!markup.includes('data-testid="since-last-visit"'));
    assert.ok(!markup.includes('data-testid="lapsed-return"'));
  });

  it("counts the weeks only when more than one has passed", () => {
    assert.equal(elapsedWeeksSuffix("2026-09-14", current.recordDate), "");
    assert.equal(elapsedWeeksSuffix("2026-08-31", current.recordDate), " (3 weeks ago)");
  });

  it("prints nothing for a date it cannot place", () => {
    assert.equal(elapsedWeeksSuffix("not a date", current.recordDate), "");
  });

  it("builds compare target for a valid past date and falls back safely", () => {
    assert.equal(
      compareHrefForRecordDate("2026-06-15"),
      "/history/compare?yearB=2026&monthB=6",
    );
    assert.equal(
      compareHrefForRecordDate("2024-11-01"),
      "/history/compare?yearB=2024&monthB=11",
    );
    assert.equal(compareHrefForRecordDate("invalid-date"), "/history/compare");
  });
});
