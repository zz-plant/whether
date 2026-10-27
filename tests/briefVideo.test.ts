import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findPublishedBrief, latestPublishedBrief } from "../lib/report/publishedBriefs";
import rawManifest from "../data/brief_videos.json";
import { renderToStaticMarkup } from "react-dom/server";
import { publishedBriefToSlidePayload } from "../lib/export/exportSnapshot";
import {
  briefVideoSourceHash,
  findBriefVideo,
  briefVideoOpenGraph,
  renderBriefVideoFrame,
  type BriefVideoAsset,
} from "../lib/export/briefVideo";

const brief = latestPublishedBrief!;
const payload = publishedBriefToSlidePayload(brief, null);

const fixture = async (): Promise<BriefVideoAsset> => ({
  slug: brief.slug,
  sourceHash: await briefVideoSourceHash(payload),
  recordDate: brief.recordDate,
  publishedAt: brief.publishedAt,
  video: `/videos/briefs/${brief.slug}-0123456789abcdef.mp4`,
  poster: `/videos/briefs/${brief.slug}-0123456789abcdef.png`,
  captions: `/videos/briefs/${brief.slug}-0123456789abcdef.vtt`,
  width: 1280,
  height: 720,
  duration: 12,
  contentType: "video/mp4",
});

describe("published brief video", () => {
  it("only advertises a rendered video whose content matches the published brief", async () => {
    const asset = await fixture();
    assert.deepEqual(await findBriefVideo(brief, [asset]), asset);
    assert.equal(await findBriefVideo({ ...brief, actionNow: "A corrected action" }, [asset]), undefined);
    assert.equal(await findBriefVideo(brief, [{ ...asset, recordDate: "2000-01-01" }]), undefined);
    assert.equal(await findBriefVideo(brief, []), undefined);
    assert.equal(await findBriefVideo({ ...brief, correction: "Corrected after publication" }, [asset]), undefined);
  });

  it("does not emit a remote or malformed video from a manifest", async () => {
    const asset = await fixture();
    assert.equal(await findBriefVideo(brief, [{ ...asset, video: "https://elsewhere.test/video.mp4" }]), undefined);
    assert.equal(await findBriefVideo(brief, [{ ...asset, width: 0 }]), undefined);
  });

  it("builds absolute og:video URLs and keeps the image fallback separate", async () => {
    const tags = briefVideoOpenGraph(await fixture());
    assert.equal(tags.url, `https://whether.work/videos/briefs/${brief.slug}-0123456789abcdef.mp4`);
    assert.equal(tags.secureUrl, tags.url);
    assert.equal(tags.type, "video/mp4");
    assert.equal(tags.width, 1280);
    assert.equal(tags.height, 720);
  });

  it("emits the MIME and secure URL tags the installed metadata shim leaves out", async () => {
    const page = await import("../app/brief/[week]/page");
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ week: rawManifest.assets[0]!.slug }) }));
    assert.match(html, /property="og:video:type" content="video\/mp4"/);
    assert.match(html, /property="og:video:secure_url" content="https:\/\/whether\.work\/videos\/briefs\//);
  });

  it("keeps the full decision and provenance visible throughout the focus sequence", () => {
    for (const phase of ["action", "pause", "change", "complete"] as const) {
      const svg = renderBriefVideoFrame(payload, phase);
      assert.ok(svg.includes(brief.recordDateLabel));
      assert.ok(svg.includes("Published weekly guidance"));
      assert.ok(svg.includes("Pause if"));
      assert.ok(svg.includes("Conditions change if"));
      assert.ok(svg.includes(payload.provenance.replace(/&/g, "&amp;")));
      assert.ok(!svg.includes("<animate"));
    }
  });

  it("the checked-in manifest points to real MP4/poster files for matching records", async () => {
    assert.ok(rawManifest.assets.length > 0);
    for (const entry of rawManifest.assets) {
      const published = findPublishedBrief(entry.slug);
      assert.ok(published);
      const asset = await findBriefVideo(published);
      assert.ok(asset, `regenerate the video for ${entry.slug} after changing its source`);
      const videoPath = join(import.meta.dirname, "..", "public", asset.video);
      const posterPath = join(import.meta.dirname, "..", "public", asset.poster);
      const captionsPath = join(import.meta.dirname, "..", "public", asset.captions);
      assert.ok(existsSync(videoPath));
      assert.ok(existsSync(posterPath));
      assert.ok(existsSync(captionsPath));
      assert.equal(readFileSync(videoPath).subarray(4, 8).toString(), "ftyp");
      assert.deepEqual([...readFileSync(posterPath).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.ok(readFileSync(captionsPath, "utf8").startsWith("WEBVTT"));
    }
  });
});
