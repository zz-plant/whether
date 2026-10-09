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

  /* A phone gets the week's word, the title and one meta line before the
     first task block (ui-ux-standards §XI). The caption stays inside the
     block, beside the status word, rather than on a row of its own. */
  it("rides beside the status word on a phone when the strip carries the meta line", () => {
    const html = renderToStaticMarkup(
      <CommandCenterNavBlock
        pageTitle="Plan"
        pageSummary="This week's guidance, turned into rules."
        recordDateLabel="Oct 5, 2026"
        statusLabel="Freezing"
        trustStatusLabel="All sources live"
        fetchedAtLabel="Oct 7, 2026, 12:19 AM UTC"
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
    const captions = [...html.matchAll(/data-screenshot-caption="[^"]*" class="([^"]*)"/g)].map(([, cls]) => cls);
    assert.equal(captions.length, 2, "one for a phone, one for the stamp row from sm");
    assert.match(captions[0], /(^|\s)sm:hidden(\s|$)/);
    assert.ok(html.indexOf("data-screenshot-caption") < html.indexOf("<h1"), "the phone caption sits on the status row");
    assert.match(captions[1], /max-sm:hidden/);
    assert.match(html, /<span class="max-sm:hidden">Checked /, "the checked stamp is a desktop line");
  });
});
