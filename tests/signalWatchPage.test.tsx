import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import SignalsClusterPage from "../app/signals/[cluster]/page";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * The signal watch pages opened on a bare heading, with the week's call in a
 * bulleted block further down that printed the call-change line under "Resume
 * when" — the label for an area's resume line, at a different number. They open
 * on the brief's own card now: the stamp, the signal as the heading, the call,
 * and the lines it holds between, each under its own label.
 */
describe("a signal watch page", () => {
  it("opens on the brief's card, with the call-change line under its own label", async () => {
    const html = renderToStaticMarkup(await SignalsClusterPage({ params: Promise.resolve({ cluster: "capital-tightness-watch" }) }));
    const text = html.replace(/<[^>]+>/g, " ").replaceAll("&#x27;", "'");

    assert.match(html, /id="share-ready-artifact"/, "the card the brief opens on");
    assert.match(html, /class="type-stamp/, "the week's stamp");
    assert.match(text, /Funding pressure watch/);
    assert.match(text, /Conditions change if/);
    assert.match(text, /Pause if/);
    assert.doesNotMatch(text, /Resume when/, "no area resume label on the call-change line");
    assert.doesNotMatch(text, /handoff/i);
  });
});
