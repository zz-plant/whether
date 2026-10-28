import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionHero } from "../app/components/DecisionHero";
import { CommandCenterNavBlock } from "../app/components/report-shell/CommandCenterNavBlock";
import { siteUrl } from "../lib/siteUrl";

/*
 * The blocks a phone screenshot catches name their own source inside their
 * border, because a screenshot is cropped to the box before it is pasted and
 * the header does not survive the crop. Rendered, not read from source: the
 * claim is about what the block draws.
 */
const host = new URL(siteUrl).host;

const captionOf = (html: string) => {
  const start = html.indexOf("data-screenshot-caption");
  assert.ok(start > 0, "the block renders a caption");
  return html.slice(start, html.indexOf("</p>", start)).replace(/<[^>]+>/g, " ");
};

describe("screenshot caption", () => {
  it("sits inside the homepage card, after the call, with the name and the host", () => {
    const html = renderToStaticMarkup(
      <DecisionHero weeklyCall="Freeze new commitments." regime="SCARCITY" />,
    );
    const card = html.slice(html.indexOf('id="share-ready-artifact"'), html.lastIndexOf("</section>"));
    assert.ok(card.indexOf("data-screenshot-caption") > card.indexOf("Freeze new commitments."));
    const caption = captionOf(card);
    assert.match(caption, /Whether/);
    assert.ok(caption.includes(host), `names ${host}`);
  });

  it("dates an archived card, which has no trust strip to carry the date", () => {
    const html = renderToStaticMarkup(
      <DecisionHero weeklyCall="Hold." regime="DEFENSIVE" captionDetail="Archived: Week of Mar 2, 2022" />,
    );
    assert.match(captionOf(html), /Archived: Week of Mar 2, 2022/);
  });

  /* Only the call card (2026-10-09). Every interior intro printed "Whether ·
     whether.work" under a header that names the site on every route; the brief's
     card is the block people crop and share, and #1561 kept the caption there. */
  it("is left out of the report intros, which keep only the checked stamp", () => {
    for (const fetchedAtLabel of ["Oct 7, 2026, 12:19 AM UTC", ""]) {
      const html = renderToStaticMarkup(
        <CommandCenterNavBlock
          pageTitle="Plan"
          pageSummary="This week's guidance, turned into rules."
          recordDateLabel="Oct 5, 2026"
          statusLabel="Freezing"
          trustStatusLabel="All sources live"
          fetchedAtLabel={fetchedAtLabel}
          showOfflineBadge={false}
          offlineBadgeLabel=""
          trustStrip={{
            recordDateLabel: "Oct 5, 2026",
            sourcesLive: true,
            sourcesLabel: "All sources live",
            confidenceLabel: "MED",
            couldChangeNextWeek: false,
            basis: { key: "record", value: "The record's inputs", warning: null },
            href: "/trust",
          }}
        />,
      );
      assert.doesNotMatch(html, /data-screenshot-caption/);
      assert.ok(!html.includes(host), "the intro does not print the host");
      if (fetchedAtLabel) assert.match(html, /<p class="[^"]*max-sm:hidden[^"]*">Checked /, "the checked stamp is a desktop line");
      else assert.doesNotMatch(html, /Checked /);
    }
  });
});
