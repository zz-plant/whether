import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ConditionsLegend } from "../app/components/home/ConditionsLegend";
import { SharedArrivalNote } from "../app/components/sharedArrival";
import { isSharedArrivalQuery, SHARE_REFERRAL_PARAM, SHARE_REFERRAL_VALUE } from "../lib/report/briefArtifact";
import { latestPublishedBrief, getPublishedBriefs } from "../lib/report/publishedBriefs";

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
    const subscribe = html.indexOf('href="#email-monday"');
    const calibrate = html.indexOf('href="#company-calibration"');
    assert.ok(subscribe !== -1 && calibrate !== -1, "both steps link to their sections");
    assert.ok(subscribe < calibrate, "the email comes first");
    assert.match(html, /Get it every Monday/);
    assert.match(html, /Scale it to your stage and runway/);
  });

  it("leaves the greeting's steps off for any other visit", () => {
    const html = renderToStaticMarkup(<ConditionsLegend thresholds={{ tightnessRegime: 70, riskAppetiteRegime: 50 }} />);
    assert.doesNotMatch(html, /Get it every Monday/);
  });
});

describe("a dated record that newer weeks replaced", () => {
  const latest = latestPublishedBrief;
  const older = getPublishedBriefs().find((brief) => brief.slug !== latest?.slug);

  it("links to live guidance above the dated card", async () => {
    assert.ok(latest && older, "the archive holds at least two weeks");
    const html = await renderRecord(older.slug);
    const notice = html.indexOf("data-newer-guidance");
    assert.ok(notice !== -1, "the notice renders");
    assert.ok(notice < html.indexOf('id="share-ready-artifact"'), "it is read before the card");
    assert.doesNotMatch(html, /This record keeps the week of/);
    assert.equal(html.match(/Read this week&#x27;s guidance/g)?.length, 1, "one link to the live brief, in the notice");
  });

  it("sends the record's Monday link to its own form, under what changed", async () => {
    assert.ok(older);
    const html = await renderRecord(older.slug);
    const form = html.indexOf('id="monday-email"');
    assert.ok(form !== -1, "the anchor is on the page");
    assert.match(html.slice(form, form + 400), /data-monday-email-inline/, "on the one-field Monday form");
    assert.ok(form > html.indexOf("What changed this week"), "after the delta");
    assert.ok(form < html.indexOf("Guidance by area"), "ahead of the areas");
    assert.match(html, /<div id="monday-email-options"/, "the full form stays at the foot");
  });

  it("says nothing of the kind on the latest week", async () => {
    assert.ok(latest);
    assert.doesNotMatch(await renderRecord(latest.slug), /data-newer-guidance/);
  });
});

describe("a reader who found the week on Google", () => {
  it("can make Whether a preferred source, through Google's own page and no third-party script", async () => {
    assert.ok(latestPublishedBrief);
    const html = await renderRecord(latestPublishedBrief.slug);
    assert.match(html, /href="https:\/\/www\.google\.com\/preferences\/source\?q=whether\.work"[^>]*>Add Whether as a preferred source</);
    assert.ok(html.indexOf("data-preferred-source") > html.indexOf('id="monday-email"'), "after the Monday email, as the other way in");
    assert.doesNotMatch(html, /news\.google\.com\/swg/);
  });
});
