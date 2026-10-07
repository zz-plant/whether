import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FrameworkSection } from "../app/trust/frameworkSection";

/*
 * /trust opened on a method essay and a blank five-prompt form, while the
 * sources — the thing a reader opens the page to check, and the rail's second
 * entry — were folded at its foot as two timestamps. The board is open under
 * the derivation now and the method is folded; these hold that order.
 */

/** True when `index` sits inside an open-tag-to-close-tag span of some <details>. */
const insideDetails = (html: string, index: number) => {
  const before = html.slice(0, index);
  return (before.match(/<details/g) ?? []).length > (before.match(/<\/details>/g) ?? []).length;
};

const renderTrust = async () => {
  const page = await import("../app/trust/page");
  return renderToStaticMarkup(await page.default({}));
};

describe("/trust draws its sources open, under the derivation", () => {
  it("puts one row per source after the formula and before anything folded", async () => {
    const html = await renderTrust();
    const formula = html.indexOf('id="formula-reference"');
    const board = html.indexOf('id="source-board"');
    const framework = html.indexOf('id="framework"');

    assert.ok(formula !== -1 && formula < board, "the board follows the score derivation");
    assert.ok(board < framework, "and comes before the method");
    assert.equal(insideDetails(html, board), false, "the board is not behind a disclosure");
    assert.equal((html.match(/data-source-row=/g) ?? []).length, 5, "every source has a row");
    for (const source of ["Treasury", "Market stress", "Inflation", "Labor", "Startup/private markets"]) {
      assert.match(html, new RegExp(`data-source-row="${source}"`));
    }
    // The verdict stays in the strip; the board says what it was judged from.
    assert.doesNotMatch(html, /Detailed verification &amp; sources/);
  });

  it("lists the rail in the order the page draws its sections", async () => {
    const { buildTrustPageModel } = await import("../app/trust/trustPageModel");
    const { reportShellModel } = await buildTrustPageModel();
    const html = await renderTrust();
    const positions = reportShellModel.page.sectionLinks.map((link) => ({
      label: link.label,
      at: html.indexOf(`id="${link.href.slice(1)}"`),
    }));

    for (const { label, at } of positions) assert.ok(at !== -1, `${label} renders the section it points at`);
    for (let index = 1; index < positions.length; index += 1) {
      assert.ok(
        positions[index - 1].at < positions[index].at,
        `${positions[index - 1].label} comes before ${positions[index].label} on the page, as in the rail`,
      );
    }
  });
});

describe("/trust folds the method and the blank form", () => {
  it("keeps the worked example open and the essay and form behind disclosures", () => {
    const html = renderToStaticMarkup(<FrameworkSection />);

    assert.equal(insideDetails(html, html.indexOf("In practice")), false, "the worked example is open");
    for (const folded of ["The three parts", "Why it works", "healthcare products", "When you will check", "No signup required"]) {
      const at = html.indexOf(folded);
      assert.ok(at !== -1, `${folded} still renders, for find-in-page and the redirects`);
      assert.equal(insideDetails(html, at), true, `${folded} is folded`);
    }
  });

  it("puts the /template anchor on the form's own disclosure, so a link opens it", () => {
    const html = renderToStaticMarkup(<FrameworkSection />);
    assert.match(html, /<details[^>]*id="template"/);
  });
});
