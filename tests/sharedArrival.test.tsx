import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ConditionsLegend } from "../app/components/home/ConditionsLegend";
import { SharedArrivalNote } from "../app/components/sharedArrival";
import { isSharedArrivalQuery, SHARE_REFERRAL_PARAM, SHARE_REFERRAL_VALUE } from "../lib/report/briefArtifact";
import { latestPublishedBrief, getPublishedBriefs, publishedBriefWeekLabel } from "../lib/report/publishedBriefs";

/*
 * A reader who follows a pasted brief knows who sent it and nothing else. Most
 * pasted links open a dated record, which is static, so the greeting there is
 * read in the browser; a record that newer weeks have replaced says so above
 * the card, so an old thread's link is not mistaken for this week's guidance.
 */

const renderRecord = async (week: string) => {
  const page = await import("../app/brief/[week]/page");
  return renderToStaticMarkup(await page.default({ params: Promise.resolve({ week }) }));
};

describe("arriving from a shared link", () => {
  it("recognizes the tag every paste prints, and no other ref", () => {
    assert.equal(isSharedArrivalQuery(`?${SHARE_REFERRAL_PARAM}=${SHARE_REFERRAL_VALUE}`), true);
    assert.equal(isSharedArrivalQuery("?ref=share&utm_source=x"), true);
    assert.equal(isSharedArrivalQuery("?ref=newsletter"), false);
    assert.equal(isSharedArrivalQuery(""), false);
  });

  it("renders no greeting on the server, where the static record cannot see the query", () => {
    assert.equal(renderToStaticMarkup(<SharedArrivalNote orientation="For startup leaders." />), "");
  });

  it("gives the homepage greeting its two next steps, the Monday email first", () => {
    const html = renderToStaticMarkup(
      <ConditionsLegend arrival="share" thresholds={{ tightnessRegime: 70, riskAppetiteRegime: 50 }} />,
    );
    const subscribe = html.indexOf('href="#subscribe"');
    const calibrate = html.indexOf('href="#company-calibration"');
    assert.ok(subscribe !== -1 && calibrate !== -1, "both steps link to their sections");
    assert.ok(subscribe < calibrate, "the email comes first");
    assert.match(html, /Get it every Monday/);
    assert.match(html, /Scale it to your stage and runway/);
  });

  it("starts the homepage form on Monday delivery for a shared arrival, so the greeting's promise holds", async () => {
    const { AlertSection } = await import("../app/components/home/AlertSection");
    const checked = (html: string) => /<input[^>]*checked=""[^>]*value="(alerts|weekly)"/.exec(html)?.[1];
    assert.equal(checked(renderToStaticMarkup(<AlertSection defaultFrequency="weekly" />)), "weekly");
    assert.equal(checked(renderToStaticMarkup(<AlertSection />)), "alerts", "any other visit keeps alerts first");
  });

  it("leaves the greeting's steps off for any other visit", () => {
    const html = renderToStaticMarkup(<ConditionsLegend thresholds={{ tightnessRegime: 70, riskAppetiteRegime: 50 }} />);
    assert.doesNotMatch(html, /Get it every Monday/);
  });
});

describe("a dated record that newer weeks replaced", () => {
  const latest = latestPublishedBrief;
  const older = getPublishedBriefs().find((brief) => brief.slug !== latest?.slug);

  it("says newer guidance is out, above the card, naming the latest week", async () => {
    assert.ok(latest && older, "the archive holds at least two weeks");
    const html = await renderRecord(older.slug);
    const notice = html.indexOf("data-newer-guidance");
    assert.ok(notice !== -1, "the notice renders");
    assert.ok(notice < html.indexOf('id="share-ready-artifact"'), "it is read before the card");
    assert.ok(html.includes(`This record keeps the week of ${publishedBriefWeekLabel(older)}.`));
    assert.equal(html.match(/Read this week&#x27;s guidance/g)?.length, 1, "one link to the live brief, in the notice");
  });

  it("sends the record's Monday link to its own form, which starts on Monday delivery", async () => {
    assert.ok(older);
    const html = await renderRecord(older.slug);
    assert.match(html, /<div id="monday-email"/);
  });

  it("says nothing of the kind on the latest week", async () => {
    assert.ok(latest);
    assert.doesNotMatch(await renderRecord(latest.slug), /data-newer-guidance/);
  });
});
