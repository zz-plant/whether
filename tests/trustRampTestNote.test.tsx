import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * The candidate rate ramps under test are noted once, as a method note under
 * the score derivation on /trust, with the registration and the results one
 * click away (docs/research/premise-test-preregistration.md §10). A second copy
 * anywhere would be the same fact twice; none at all would leave a stored
 * shadow score unexplained.
 */

const renderTrust = async () => {
  const page = await import("../app/trust/page");
  return renderToStaticMarkup(await page.default({}));
};

describe("/trust notes the ramp test once", () => {
  it("draws one note, inside the derivation, linking the registration and the results", async () => {
    const html = await renderTrust();
    const notes = html.match(/data-ramp-test-note/g) ?? [];
    assert.equal(notes.length, 1);

    const note = html.indexOf("data-ramp-test-note");
    const formula = html.indexOf('id="formula-reference"');
    const board = html.indexOf('id="source-board"');
    assert.ok(formula !== -1 && formula < note && note < board, "the note sits in the score derivation");

    const paragraph = html.slice(note, html.indexOf("</p>", note));
    assert.match(paragraph, /none of them sets the guidance/);
    /* On this site: the repository is private, so a GitHub link is a 404 for every reader. */
    assert.match(paragraph, /href="\/research\/premise-test-registration\.md"/);
    assert.match(paragraph, /href="\/research\/premise-test-results\.md"/);
    assert.doesNotMatch(paragraph, /github\.com/);
    assert.equal((html.match(/none of them sets the guidance/g) ?? []).length, 1, "the sentence is printed once");
  });
});
