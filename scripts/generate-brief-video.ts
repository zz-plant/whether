#!/usr/bin/env bun
/** Offline MP4 + poster for a frozen week. No encoder runs in the Worker. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import { findPublishedBrief, latestPublishedBrief } from "../lib/report/publishedBriefs";
import { publishedBriefToSlidePayload } from "../lib/export/exportSnapshot";
import { briefVideoManifestSchema, briefVideoSourceHash, renderBriefVideoFrame, type BriefVideoAsset } from "../lib/export/briefVideo";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const weekIndex = args.indexOf("--week");
if (args.some((arg, index) => arg !== "--week" && index !== weekIndex + 1)) {
  throw new Error("Usage: bun run assets:video [--week YYYY-wNN]");
}
const week = weekIndex >= 0 ? args[weekIndex + 1] : latestPublishedBrief?.slug;
const brief = week ? findPublishedBrief(week) : undefined;
if (!brief) throw new Error(`No frozen brief found for ${week ?? "the latest week"}. Freeze a brief before rendering video.`);
if (brief.correction) throw new Error("This brief has a correction; include it in the video rendering contract before generating a clip.");

const output = join(root, "public/videos/briefs");
const manifestPath = join(root, "data/brief_videos.json");
const payload = publishedBriefToSlidePayload(brief, null);
const sourceHash = await briefVideoSourceHash(payload);
const stem = `${brief.slug}-${sourceHash.slice(0, 16)}`;
const videoPath = join(output, `${stem}.mp4`);
const posterPath = join(output, `${stem}.png`);
const captionsPath = join(output, `${stem}.vtt`);
const work = mkdtempSync(join(tmpdir(), "whether-brief-video-"));

/** The clip is silent: its track says what each beat shows, on the same cuts. */
const buildVideoCaptions = (): string => [
  "WEBVTT",
  "",
  "00:00.000 --> 00:01.750",
  "The week's action, highlighted on the slide.",
  "",
  "00:01.750 --> 00:03.500",
  "Its pause line, highlighted.",
  "",
  "00:03.500 --> 00:05.250",
  "Where the guidance changes, highlighted.",
  "",
  "00:05.250 --> 00:12.000",
  "The complete slide, held: the guidance, its pause and change lines, both scores and the source.",
  "",
].join("\n");

try {
  mkdirSync(output, { recursive: true });
  const phases = ["action", "pause", "change", "complete"] as const;
  for (const phase of phases) {
    const svg = join(work, `${phase}.svg`);
    writeFileSync(svg, renderBriefVideoFrame(payload, phase));
    execFileSync("rsvg-convert", ["-w", "1280", "-h", "720", "-o", join(work, `${phase}.png`), svg], { stdio: "pipe", timeout: 30_000 });
  }

  // Three two-second focus beats, then six seconds on the complete slide.
  // A short crossfade moves attention without simulating a change in the data.
  const inputArgs = phases.flatMap((phase, index) => ["-loop", "1", "-t", index === 3 ? "6.75" : "2", "-i", join(work, `${phase}.png`)]);
  const filter = "[0:v][1:v]xfade=transition=fade:duration=0.25:offset=1.75[a];[a][2:v]xfade=transition=fade:duration=0.25:offset=3.5[b];[b][3:v]xfade=transition=fade:duration=0.25:offset=5.25,format=yuv420p[v]";
  const temporaryVideo = join(work, `${stem}.mp4`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputArgs, "-filter_complex", filter,
    "-map", "[v]", "-r", "30", "-t", "12", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", "-map_metadata", "-1", temporaryVideo],
  { stdio: "pipe", timeout: 180_000 });

  const probeSchema = z.object({
    streams: z.array(z.object({
      codec_type: z.string(),
      codec_name: z.string(),
      width: z.number(),
      height: z.number(),
      pix_fmt: z.string(),
    })),
    format: z.object({ duration: z.string() }),
  });
  const probe = probeSchema.parse(JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", temporaryVideo], { encoding: "utf8" })));
  const stream = probe.streams.find((candidate) => candidate.codec_type === "video");
  if (!stream || stream.codec_name !== "h264" || stream.pix_fmt !== "yuv420p" || stream.width !== 1280 || stream.height !== 720) {
    throw new Error("Encoded video did not meet the H.264/1280×720/yuv420p contract.");
  }
  const duration = Number(probe.format.duration);
  if (!Number.isFinite(duration) || Math.abs(duration - 12) > 0.1) throw new Error("Encoded video duration did not match the 12-second timeline.");

  const asset: BriefVideoAsset = {
    slug: brief.slug, sourceHash, recordDate: brief.recordDate, publishedAt: brief.publishedAt,
    video: `/videos/briefs/${stem}.mp4`, poster: `/videos/briefs/${stem}.png`, captions: `/videos/briefs/${stem}.vtt`,
    width: stream.width, height: stream.height, duration, contentType: "video/mp4",
  };
  const existing = existsSync(manifestPath)
    ? briefVideoManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")))
    : { version: 1, assets: [] satisfies BriefVideoAsset[] };
  // Promote media before the manifest, so metadata never names a partial render.
  writeFileSync(posterPath, readFileSync(join(work, "complete.png")));
  writeFileSync(videoPath, readFileSync(temporaryVideo));
  writeFileSync(captionsPath, buildVideoCaptions());
  const manifest = { version: 1, assets: [...existing.assets.filter((entry) => entry.slug !== brief.slug), asset].sort((a, b) => b.slug.localeCompare(a.slug)) };
  const temporaryManifest = `${manifestPath}.tmp`;
  writeFileSync(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(temporaryManifest, manifestPath);
  console.log(`Rendered ${brief.slug}: ${asset.video} (${duration}s, H.264) and poster.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
