import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StreamedSectionReveal } from "../app/components/streamedSectionReveal";

describe("StreamedSectionReveal", () => {
  it("renders the streamed reveal wrapper with the requested delay", () => {
    const html = renderToStaticMarkup(
      <StreamedSectionReveal delay="medium">
        <div>Deferred diagnostics</div>
      </StreamedSectionReveal>,
    );

    assert.match(html, /weather-stream-reveal/);
    assert.match(html, /weather-stream-reveal--medium/);
    assert.match(html, /Deferred diagnostics/);
  });
});
