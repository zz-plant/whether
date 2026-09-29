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

  it("sits inside every report intro, including one with no refresh stamp", () => {
    for (const fetchedAtLabel of ["Sep 29, 2026, 6:33 PM UTC", ""]) {
      const html = renderToStaticMarkup(
        <CommandCenterNavBlock
          pageTitle="How much to trust this week's guidance"
          pageSummary="Check whether this week's guidance is current enough to act on."
          recordDateLabel="Sep 25, 2026"
          statusLabel="Freezing"
          trustStatusLabel="All sources live"
          fetchedAtLabel={fetchedAtLabel}
          showOfflineBadge={false}
          offlineBadgeLabel=""
        />,
      );
      assert.ok(captionOf(html).includes(host));
    }
  });
});
