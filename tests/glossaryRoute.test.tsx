import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import GlossaryPage from "../app/glossary/page";
import { BEGINNER_GLOSSARY_ENTRIES, DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";
import { GLOSSARY_HREF, regimeSignalLabel } from "../lib/report/signalTranslations";
import { utilityLinks } from "../lib/navigation/informationArchitecture";


/**
 * The glossary used to be a collapsed disclosure inside `/trust`, so every
 * "unfamiliar with a term?" link on the site sent a reader who did not know the
 * vocabulary to a page about source freshness and confidence. It has its own
 * route now.
 */
describe("/glossary", () => {
  it("renders every term", () => {
    const html = renderToStaticMarkup(<GlossaryPage />);

    for (const entry of BEGINNER_GLOSSARY_ENTRIES) {
      assert.ok(html.includes(entry.term), `"${entry.term}" is not on the page`);
    }
  });

  it("is where the canonical glossary link points", () => {
    assert.equal(GLOSSARY_HREF, "/glossary");
    assert.ok(
      utilityLinks.some((link) => link.href === GLOSSARY_HREF),
      "the glossary is not reachable from the nav",
    );
  });

  it("defines the three decision lines under the names the brief draws them by", () => {
    const html = renderToStaticMarkup(<GlossaryPage />);

    /* The reader meeting "Pause if 76 crossed" on the hero has to find that
       phrase here, not a synonym. Four entries used to cover these three lines,
       two of them naming the same line twice. */
    for (const label of [
      DECISION_CONTRACT_LABELS.threshold.pauseIf,
      DECISION_CONTRACT_LABELS.reversal.resumeWhen,
      DECISION_CONTRACT_LABELS.watch.postureFlips,
    ]) {
      assert.ok(html.includes(label), `no entry defines "${label}"`);
    }

    const terms = BEGINNER_GLOSSARY_ENTRIES.map((entry) => entry.term);
    for (const retired of ["Guardrail (pause trigger)", "Stop line (guardrail trigger)", "Clears-when condition"]) {
      assert.ok(!terms.includes(retired), `"${retired}" is back in the glossary`);
    }
  });

  it("names the short rate the way every other surface does", () => {
    const html = renderToStaticMarkup(<GlossaryPage />);

    assert.ok(html.includes(regimeSignalLabel.baseRate));
    assert.ok(!html.includes("Fed interest rate"));
  });
});
