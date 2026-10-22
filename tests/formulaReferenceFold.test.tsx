import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FormulaReference } from "../app/trust/formulaReference";

/*
 * The plain-language derivation folds on a stable week (app/trust/page.tsx
 * passes `plainLanguageFolded`), reclaiming most of the page's dominant block
 * for the source board a scanner comes to check (DD-040). The fold must keep
 * three properties: the summary names what is behind it (§XII), the derivation
 * stays server-rendered inside the <details> so search and find-in-page reach
 * it, and the URL can open it (`?derivation=1` → the `open` attribute on first
 * paint). Unfolded — a degraded week — nothing changes.
 */
const render = (props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(<FormulaReference {...(props as never)} />);

describe("the plain-language derivation fold", () => {
  it("folds behind a summary that names what is behind it, content still server-rendered", () => {
    const html = render({ plainLanguageFolded: true });
    assert.match(html, /<details[^>]*class="[^"]*weather-auto-chevron/, "a chevron details carries the fold");
    assert.match(
      html,
      /In plain language — what each score reads, and how the pair sets the conditions/,
      "the summary names what is behind it",
    );
    /* The derivation itself stays in the server-rendered markup, not behind a
       client fetch: a search engine and find-in-page both reach it. */
    assert.match(html, /1\. Read two things off public U\.S\. market data\./);
    assert.match(html, /4\. Turn the pair into conditions\./);
  });

  it("opens from the URL on first paint (plainLanguageOpen → the open attribute)", () => {
    const html = render({ plainLanguageFolded: true, plainLanguageOpen: true });
    assert.match(html, /<details[^>]*\bopen\b/, "?derivation=1 renders the fold open server-side");
  });

  it("renders the tier open and unframed by a details when not folded", () => {
    const html = render();
    assert.doesNotMatch(html, /In plain language — what each score reads/, "no fold summary when open");
    assert.match(html, /type-eyebrow">In plain language</, "the visible eyebrow stays when open");
    assert.match(html, /1\. Read two things off public U\.S\. market data\./);
  });
});
