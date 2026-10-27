/*
 * The frame audit's judgements, kept apart from the browser so they can be tested offline
 * (tests/uiFramesLib.test.ts). `scripts/ui-frames.mjs` measures each screen-height frame of a
 * route in Chromium; this file decides what the measurements mean.
 *
 * Why frames: a phone screenshot is the whole screen at whatever point the reader stopped
 * scrolling, and that picture is what reaches a Slack channel. A page reads well as a
 * screenshot only if every frame of it does: the frame names the site, the date and the
 * conditions, and no block a reader would share is too tall to fit in one.
 */

/** Scroll offsets that tile the page in frames, the last one ending at the page's foot. */
export const frameOffsets = (pageHeight, frameHeight, maxFrames = 8) => {
  const offsets = [];
  const last = Math.max(0, pageHeight - frameHeight);
  for (let top = 0; top < last && offsets.length < maxFrames - 1; top += frameHeight) offsets.push(top);
  if (offsets.length < maxFrames) offsets.push(last);
  return [...new Set(offsets)];
};

/**
 * Blocks no frame can hold whole: taller than the screen left under the running head.
 * A block marked `data-frame-exempt` (a long archive table a reader opens on purpose) is
 * left out by the collector, not here.
 */
export const tallBlocks = (blocks, usableHeight) =>
  blocks.filter((block) => block.height > usableHeight).sort((left, right) => right.height - left.height);

/**
 * What a frame lacks as a standalone screenshot. The first frame is the page's own top,
 * whose intro names everything; from the second on, the running head has to.
 */
const FACT_PRESENT = { site: (frame) => frame.site, date: (frame) => frame.dated, conditions: (frame) => frame.condition };

export const frameGaps = (frame, requires = ["site", "date", "conditions"]) =>
  requires.filter((fact) => !FACT_PRESENT[fact](frame));

/**
 * What a frame keeps at the size a channel first shows it. Slack previews an image at
 * about 360px tall, so a 900px laptop frame shrinks to 0.4 and an 844px phone frame to
 * about 0.43. A frame has a focal point there if its largest type is still about 9px,
 * or a figure is still 100px tall: the thing a reader sees before deciding to open it.
 * Reported, not failed: not every frame of a page can lead with large type.
 */
export const PREVIEW_HEIGHT_PX = 360;
export const hasThumbnailFocal = (frame, viewportHeight) => {
  const scale = PREVIEW_HEIGHT_PX / viewportHeight;
  return (frame.largestTextPx ?? 0) * scale >= 9 || (frame.largestGraphicPx ?? 0) * scale >= 100;
};

/** The checks a route fails, empty when every frame stands alone and every block fits one. */
export const routeFailures = ({ frames, tall, requires }) => [
  ...frames
    .filter((frame) => frameGaps(frame, requires).length > 0)
    .map((frame) => `frame ${frame.index} (y=${frame.y}) names no ${frameGaps(frame, requires).join(", no ")}`),
  ...tall.map((block) => `"${block.label}" is ${block.height}px, taller than a ${block.usableHeight}px frame`),
];

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** One row of frames per route and viewport, each frame captioned with what it lacks. */
export const buildFramesGalleryHtml = ({ baseUrl, routes, generatedAt }) => {
  const rows = routes
    .map((route) => {
      const frames = route.frames
        .map((frame) => {
          const gaps = frame.index === 0 ? [] : frameGaps(frame, route.requires);
          const advisory = [
            ...frame.cut.map((block) => `cuts “${block.label}”`),
            ...frame.orphans.map((heading) => `heading alone at the foot: “${heading}”`),
          ];
          return `<figure><img src="${escapeHtml(frame.file)}" alt="Frame ${frame.index}" loading="lazy"><figcaption><b>${frame.index}</b> ${
            gaps.length ? `<span class="bad">no ${escapeHtml(gaps.join(", no "))}</span>` : `<span class="ok">stands alone</span>`
          }${advisory.length ? `<br>${advisory.map(escapeHtml).join("<br>")}` : ""}</figcaption></figure>`;
        })
        .join("");
      const tall = route.tall.length
        ? `<p class="bad">Taller than a frame: ${route.tall.map((block) => `${escapeHtml(block.label)} (${block.height}px)`).join("; ")}</p>`
        : "";
      return `<section><h2>${escapeHtml(route.path)} · ${escapeHtml(route.viewport)}</h2>${tall}<div class="row ${escapeHtml(route.viewport)}">${frames}</div></section>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Whether frame audit</title><style>
body{font:14px system-ui;margin:24px;background:#f4f4f2;color:#111}h2{font-size:15px;margin:24px 0 8px}
.row{display:flex;gap:12px;overflow-x:auto}.row figure{margin:0;flex:none}.row.desktop img{width:420px}.row.phone img{width:200px}
img{display:block;border:1px solid #ccc}figcaption{font-size:12px;max-width:420px;margin-top:4px}.bad{color:#b4232a}.ok{color:#1d6b3a}
</style></head><body><h1>Frame audit</h1><p>${escapeHtml(baseUrl)} · ${escapeHtml(generatedAt)}</p>${rows}</body></html>`;
};
