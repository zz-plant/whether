/*
 * Frame audit: every screen-height frame of each live route, judged as a standalone
 * screenshot (the judgements are scripts/ui-frames.lib.mjs).
 *
 *   bun run ui:frames                          # against UI_CAPTURE_BASE_URL or :3000
 *   bun run ui:frames -- --base-url http://localhost:3163 --only /signals,/history
 *   bun run ui:frames -- --strict              # exit 1 on any failing route
 *
 * Writes artifacts/ui/frames/: one PNG per frame, report.json, and index.html (one row of
 * frames per route, each captioned with what it lacks). Not in `bun run check`: the gate has
 * no browser. Run it after layout work, beside `bun run ui:iterate`.
 *
 * A reader scrolls down to a frame rather than jumping to it, so the walk scrolls in steps:
 * the header and the running head respond to scroll direction, and a jump would show the
 * page in a state no reader sees.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  DEFAULT_UI_CAPTURE_BASE_URL,
  ensureBaseUrlReachable,
  hasFlag,
  launchChromium,
  readArgValue,
  waitForCaptureReady,
  waitForLayoutSettled,
} from "./ui-capture.lib.mjs";
import { captureStorageSeeds, frameAuditRoutes, frameAuditViewports, frameBlockSelector } from "./ui-capture.config.mjs";
import { buildFramesGalleryHtml, frameGaps, frameOffsets, hasThumbnailFocal, routeFailures, tallBlocks } from "./ui-frames.lib.mjs";

const args = process.argv.slice(2);
const baseUrl = readArgValue(args, "--base-url", DEFAULT_UI_CAPTURE_BASE_URL);
const outDir = path.resolve(process.cwd(), readArgValue(args, "--out", "artifacts/ui/frames"));
const only = readArgValue(args, "--only", "");
const onlyPaths = only ? only.split(",").map((item) => item.trim()).filter(Boolean) : null;
const routes = onlyPaths ? frameAuditRoutes.filter(({ path: route }) => onlyPaths.includes(route)) : frameAuditRoutes;
const strict = hasFlag(args, "--strict");
const MAX_FRAMES = 8;
const SCROLL_STEP = 240;

/* Runs in the page. Everything a frame shows, measured from what is painted: text a
   screen reader alone hears (`.sr-only`) and content inside a closed disclosure do not
   count, because a screenshot does not contain them. */
const measureFrame = (blockSelector) => {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const onScreen = (rect) => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw;
  const painted = (element) => {
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      if (node.classList?.contains("sr-only")) return false;
      // A closed disclosure still reports its contents' layout; only its summary is on screen.
      const parent = node.parentElement;
      if (parent?.tagName === "DETAILS" && !parent.open && node.tagName !== "SUMMARY") return false;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    }
    return element.getClientRects().length > 0;
  };
  const label = (element) =>
    (element.querySelector("h2, h3, figcaption, caption, summary, legend, p")?.textContent ?? element.tagName)
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 70);

  let text = "";
  // The largest painted type, and the tallest graphic: what is left of a frame at thumbnail size.
  let largestTextPx = 0;
  let largestText = "";
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!node.textContent.trim() || !parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    if (![...range.getClientRects()].some(onScreen) || !painted(parent)) continue;
    text += ` ${node.textContent}`;
    const size = Number.parseFloat(getComputedStyle(parent).fontSize) || 0;
    if (size > largestTextPx) {
      largestTextPx = size;
      largestText = node.textContent.trim().replace(/\s+/g, " ").slice(0, 60);
    }
  }
  let largestGraphicPx = 0;
  for (const graphic of document.querySelectorAll("main svg, main img, main canvas")) {
    const rect = graphic.getBoundingClientRect();
    if (!onScreen(rect) || !painted(graphic)) continue;
    largestGraphicPx = Math.max(largestGraphicPx, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
  }
  const words = text.replace(/\s+/g, " ");

  const head = document.querySelector("[data-running-head]");
  const headRect = head && painted(head) ? head.getBoundingClientRect() : null;
  const headHeight = headRect && headRect.top < 120 && headRect.bottom > 0 ? Math.max(0, headRect.bottom) : 0;

  const blocks = [...document.querySelectorAll(blockSelector)].filter(
    (element) => painted(element) && !element.closest("[data-frame-exempt]") && !element.querySelector(blockSelector),
  );
  const cut = [];
  for (const element of blocks) {
    const rect = element.getBoundingClientRect();
    if (!onScreen(rect) || rect.height < 80 || rect.height > vh - headHeight) continue;
    const shown = (Math.min(rect.bottom, vh) - Math.max(rect.top, headHeight)) / rect.height;
    if (shown > 0.1 && shown < 0.9) cut.push({ label: label(element), shown: Math.round(shown * 100) });
  }
  // A heading left at the foot: on screen, with under 64px (about two lines) of its section below it.
  const orphans = [...document.querySelectorAll("main h2, main h3")]
    .filter((heading) => painted(heading))
    .filter((heading) => {
      const rect = heading.getBoundingClientRect();
      return rect.top > headHeight && rect.bottom <= vh && vh - rect.bottom < 64;
    })
    .map((heading) => heading.textContent.trim().replace(/\s+/g, " ").slice(0, 70));

  const header = document.querySelector("header");
  const headerRect = header ? header.getBoundingClientRect() : null;
  return {
    site: (headerRect && headerRect.bottom > 8 && painted(header)) || /\bWhether\b/.test(words),
    dated: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}(,? \d{4})?\b|\bweek of\b/i.test(words),
    condition: /\b(Sunny|Cloudy|Stormy|Freezing)\b/.test(words),
    headHeight: Math.round(headHeight),
    largestTextPx: Math.round(largestTextPx),
    largestText,
    largestGraphicPx: Math.round(largestGraphicPx),
    cut,
    orphans,
  };
};

/* Runs in the page: every block a frame cannot hold whole, by its painted height. */
const measureBlocks = (blockSelector) => {
  const painted = (element) => {
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      if (node.classList?.contains("sr-only")) return false;
      const parent = node.parentElement;
      if (parent?.tagName === "DETAILS" && !parent.open && node.tagName !== "SUMMARY") return false;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
    }
    return element.getClientRects().length > 0;
  };
  return [...document.querySelectorAll(blockSelector)]
    .filter((element) => painted(element) && !element.closest("[data-frame-exempt]") && !element.querySelector(blockSelector))
    .map((element) => ({
      label: (element.querySelector("h2, h3, figcaption, caption, summary, legend, p")?.textContent ?? element.tagName)
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 70),
      height: Math.round(element.getBoundingClientRect().height),
    }));
};

const scrollTo = async (page, from, to) => {
  for (let top = from + SCROLL_STEP; top < to; top += SCROLL_STEP) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
    await page.waitForTimeout(40);
  }
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), to);
  await page.waitForTimeout(450);
};

const run = async () => {
  await ensureBaseUrlReachable(baseUrl);
  await mkdir(outDir, { recursive: true });
  const browser = await launchChromium();
  const report = [];
  try {
    for (const { name, viewport, deviceScaleFactor, isMobile = false } of frameAuditViewports) {
      const context = await browser.newContext({ viewport, deviceScaleFactor, isMobile, hasTouch: isMobile, reducedMotion: "reduce" });
      for (const seed of captureStorageSeeds({ theme: "dark", visitor: "returning" })) {
        await context.addInitScript(([key, value]) => window.localStorage.setItem(key, value), seed);
      }
      const page = await context.newPage();
      for (const { path: route, requires } of routes) {
        const slug = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
        console.log(`Framing ${route} at ${name}`);
        await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "load", timeout: 90000 });
        await waitForCaptureReady(page, { path: route });
        await waitForLayoutSettled(page);
        // Read here, not from the settle wait: that returns -1 when the network never idles.
        const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        const frames = [];
        let at = 0;
        for (const [index, y] of frameOffsets(pageHeight, viewport.height, MAX_FRAMES).entries()) {
          await scrollTo(page, at, y);
          at = y;
          const measured = await page.evaluate(measureFrame, frameBlockSelector);
          const file = `${name}-${slug}-${String(index).padStart(2, "0")}.png`;
          await page.screenshot({ path: path.join(outDir, file) });
          frames.push({ index, y, file, ...measured });
        }
        const usableHeight = viewport.height - Math.max(0, ...frames.slice(1).map((frame) => frame.headHeight));
        const tall = tallBlocks(await page.evaluate(measureBlocks, frameBlockSelector), usableHeight).map((block) => ({
          ...block,
          usableHeight,
        }));
        // The first frame is the page's own top, which its intro names; the check starts at the second.
        const failures = routeFailures({ frames: frames.slice(1), tall, requires });
        const focal = frames.filter((frame) => hasThumbnailFocal(frame, viewport.height)).length;
        report.push({ path: route, viewport: name, requires, frames, tall, failures, focal });
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  await writeFile(path.join(outDir, "index.html"), buildFramesGalleryHtml({ baseUrl, routes: report, generatedAt: new Date().toISOString() }));

  const failing = report.filter((route) => route.failures.length > 0);
  for (const route of report) {
    const frameCount = route.frames.length;
    const standing = frameCount - route.frames.slice(1).filter((frame) => frameGaps(frame, route.requires).length > 0).length;
    console.log(
      `${route.failures.length ? "✗" : "✓"} ${route.viewport.padEnd(7)} ${route.path.padEnd(20)} ${standing}/${frameCount} frames stand alone · ${route.tall.length} blocks taller than a frame · ${route.focal}/${frameCount} keep a focal point at preview size`,
    );
    for (const failure of route.failures) console.log(`    ${failure}`);
  }
  console.log(`\nGallery: ${path.join(outDir, "index.html")}`);
  if (strict && failing.length > 0) process.exit(1);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
