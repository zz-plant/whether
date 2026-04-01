import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NextStepRail } from "../app/components/nextStepRail";

describe("NextStepRail", () => {
  it("states the five-surface loop and the current route cue", () => {
    const html = renderToStaticMarkup(
      <NextStepRail currentPath="/signals" />,
    );

    assert.match(html, /Use the five-surface loop: Weekly Brief → Evidence → Planning → Decision Tools → Trust\./);
    assert.match(html, /You are here/);
    assert.match(html, /Surface 2 of 5/);
    assert.match(html, /Route \/signals/);
    assert.match(html, /Return to Weekly Brief/);
  });
});
