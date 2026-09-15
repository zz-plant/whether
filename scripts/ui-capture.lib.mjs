import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { uiCaptureTargets } from "./ui-capture.config.mjs";

export const DEFAULT_UI_CAPTURE_BASE_URL =
  process.env.UI_CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";
export const DEFAULT_UI_CAPTURE_OUT_DIR = "artifacts/ui";
const HTML_ASSET_PATTERN = /<(?:link|script)\b[^>]+(?:href|src)="([^"]+)"/gi;
export const STREAMED_CONTENT_READY_SELECTOR = "#share-ready-artifact";
export const STREAMED_CONTENT_READY_TIMEOUT_MS = 15000;

export const readArgValue = (args, flag, fallback) => {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : fallback;
};

export const hasFlag = (args, flag) => args.includes(flag);

export const parseOnlyIds = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const resolveCaptureTargets = (onlyIds = []) => {
  if (onlyIds.length === 0) {
    return [...uiCaptureTargets];
  }

  return uiCaptureTargets.filter((target) => onlyIds.includes(target.id));
};

export const listCaptureTargets = () =>
  uiCaptureTargets.map((target) => `${target.id}\t${target.label}\t${target.path}`);

const CAPTURE_THEMES = new Set(["dark", "light"]);

/**
 * `--theme light` captures the light theme. The app reads its theme from
 * localStorage in a bootstrap script that runs before first paint
 * (`buildThemeBootstrapScript` in app/layout.tsx), so the capture seeds the
 * same key from an init script and the page renders light from the first
 * frame — no toggle click, no flash of the dark shell in the PNG. Files land
 * as `<id>-light.png` so a light set can sit beside the dark one it is
 * compared against. Until 2026-09-15 the harness could not capture light at
 * all, which is how the light theme shipped contrast bugs nobody saw.
 */
export const parseCaptureTheme = (args) => {
  const theme = readArgValue(args, "--theme", "dark");
  if (!CAPTURE_THEMES.has(theme)) {
    throw new Error(`\`--theme\` must be one of ${[...CAPTURE_THEMES].join(", ")}; got "${theme}".`);
  }
  return theme;
};

export const parseCaptureOptions = (args) => {
  const onlyIds = parseOnlyIds(readArgValue(args, "--only", ""));

  return {
    args,
    baseUrl: readArgValue(args, "--base-url", DEFAULT_UI_CAPTURE_BASE_URL),
    outDir: readArgValue(args, "--out-dir", DEFAULT_UI_CAPTURE_OUT_DIR),
    onlyIds,
    theme: parseCaptureTheme(args),
    targets: resolveCaptureTargets(onlyIds),
  };
};

const isReachableStatus = (status) => status === 200 || status === 503;

const extractPageAssetUrls = (html, baseUrl) => {
  const assetUrls = new Set();

  for (const match of html.matchAll(HTML_ASSET_PATTERN)) {
    const rawUrl = match[1];
    if (!rawUrl) continue;

    try {
      const resolvedUrl = new URL(rawUrl, baseUrl);
      if (resolvedUrl.pathname.startsWith("/assets/")) {
        assetUrls.add(resolvedUrl.toString());
      }
    } catch {
      continue;
    }
  }

  return [...assetUrls];
};

const probeAssetUrl = async (assetUrl) => {
  const fallbackFetch = async () => fetch(assetUrl, {
    method: "GET",
    signal: AbortSignal.timeout(2500),
  });

  try {
    const response = await fetch(assetUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(2500),
    });

    if (response.status === 405 || response.status === 501) {
      const fallbackResponse = await fallbackFetch();
      return {
        ok: fallbackResponse.ok,
        status: fallbackResponse.status,
      };
    }

    return {
      ok: response.ok,
      status: response.status,
    };
  } catch {
    try {
      const fallbackResponse = await fallbackFetch();
      return {
        ok: fallbackResponse.ok,
        status: fallbackResponse.status,
      };
    } catch (fallbackError) {
      return {
        ok: false,
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      };
    }
  }
};

export const probeHtmlAssetIntegrity = async (baseUrl) => {
  const pageUrl = new URL("/", baseUrl).toString();

  try {
    const response = await fetch(pageUrl, {
      method: "GET",
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return {
        ok: false,
        pageUrl,
        error: `${pageUrl} returned ${response.status}`,
      };
    }

    const html = await response.text();
    const assetUrls = extractPageAssetUrls(html, baseUrl);

    if (assetUrls.length === 0) {
      return {
        ok: true,
        pageUrl,
        assetUrls,
      };
    }

    const failingAssets = [];

    for (const assetUrl of assetUrls.slice(0, 12)) {
      const assetProbe = await probeAssetUrl(assetUrl);
      if (!assetProbe.ok) {
        const pathname = new URL(assetUrl).pathname;
        failingAssets.push(
          assetProbe.error ? `${pathname} (${assetProbe.error})` : `${pathname} (${assetProbe.status ?? "unknown"})`,
        );
      }
    }

    if (failingAssets.length > 0) {
      return {
        ok: false,
        pageUrl,
        assetUrls,
        failingAssets,
        error: `HTML referenced missing assets: ${failingAssets.join(", ")}`,
      };
    }

    return {
      ok: true,
      pageUrl,
      assetUrls,
    };
  } catch (error) {
    return {
      ok: false,
      pageUrl,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const probeBaseUrl = async (baseUrl) => {
  const healthUrl = new URL("/api/health", baseUrl).toString();
  const assetProbe = await probeHtmlAssetIntegrity(baseUrl);

  let healthStatus;
  let healthError;

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
    });
    healthStatus = response.status;
  } catch (error) {
    healthError = error instanceof Error ? error.message : String(error);
  }

  const healthOk = healthStatus != null ? isReachableStatus(healthStatus) : false;

  return {
    ok: assetProbe.ok && (healthOk || healthError != null),
    status: healthStatus,
    healthUrl,
    assetProbe,
    error: assetProbe.ok ? undefined : assetProbe.error ?? healthError,
    healthError,
  };
};

export const ensureBaseUrlReachable = async (baseUrl) => {
  const probe = await probeBaseUrl(baseUrl);

  if (probe.ok) {
    return probe;
  }

  const detail = probe.error
    ? `${probe.healthUrl} failed: ${probe.error}`
    : `${probe.healthUrl} returned ${probe.status}`;
  throw new Error(
    `UI capture could not reach ${baseUrl}. Start the app first or pass --base-url. ${detail}`,
  );
};

// The homepage brief streams; captures of "/" wait for the share artifact to
// hydrate before screenshotting.
const isStreamedCapturePath = (targetPath) => {
  try {
    return new URL(targetPath, "http://capture.local").pathname === "/";
  } catch {
    return false;
  }
};

export const waitForCaptureReady = async (page, target) => {
  const readySelector = target.readySelector
    ?? (isStreamedCapturePath(target.path) ? STREAMED_CONTENT_READY_SELECTOR : null);

  if (!readySelector) {
    return false;
  }

  await page.waitForSelector(readySelector, {
    timeout: target.readyTimeoutMs ?? STREAMED_CONTENT_READY_TIMEOUT_MS,
  });
  return true;
};

const LAYOUT_SETTLE_TIMEOUT_MS = 6000;
const LAYOUT_SETTLE_POLL_MS = 150;

/**
 * `load` fires before client hydration, and several routes render different
 * content once hydrated — `/planning` drops to just the active step, which made
 * captures ~2.7x taller than the page any user sees. Wait for the document to
 * stop changing height so the screenshot matches the hydrated layout.
 */
export const waitForLayoutSettled = async (page, timeoutMs = LAYOUT_SETTLE_TIMEOUT_MS) => {
  const deadline = Date.now() + timeoutMs;

  try {
    await page.waitForLoadState("networkidle", { timeout: timeoutMs });
  } catch {
    // Long-lived connections mean networkidle may never arrive; the height poll
    // below is the real settle signal.
  }

  let previous = -1;
  let stableReads = 0;
  while (Date.now() < deadline) {
    const height = await page.evaluate(() => document.body.scrollHeight);
    if (height === previous) {
      stableReads += 1;
      if (stableReads >= 2) return height;
    } else {
      stableReads = 0;
      previous = height;
    }
    await page.waitForTimeout(LAYOUT_SETTLE_POLL_MS);
  }
  return previous;
};

/**
 * Playwright resolves a browser build number pinned to its own version. A managed
 * container (Claude Code on the web) ships a Chromium that predates the pinned build
 * and cannot download the matching one, so the default launch fails with "Executable
 * doesn't exist" even though a perfectly usable Chromium is installed.
 *
 * Fall back to that binary rather than failing the capture. Local runs, where the
 * pinned build is present, keep the default resolution and never see this path.
 */
const resolveExecutableOverride = () => {
  const explicit = process.env.WHETHER_CHROMIUM_PATH;
  if (explicit) return existsSync(explicit) ? explicit : undefined;
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsersPath) return undefined;
  const candidate = path.join(browsersPath, "chromium");
  return existsSync(candidate) ? candidate : undefined;
};

const launchChromium = async () => {
  try {
    return await chromium.launch();
  } catch (error) {
    const executablePath = resolveExecutableOverride();
    if (!executablePath) throw error;
    console.warn(
      `[ui-capture] pinned Chromium build unavailable; falling back to ${executablePath}`,
    );
    return chromium.launch({ executablePath });
  }
};

const THEME_STORAGE_KEY = "whether-theme";

export const captureFileName = (targetId, theme = "dark") =>
  theme === "light" ? `${targetId}-light.png` : `${targetId}.png`;

export const captureTargets = async ({ baseUrl, outDir, targets, theme = "dark" }) => {
  await mkdir(outDir, { recursive: true });

  const browser = await launchChromium();
  const captures = [];

  try {
    for (const target of targets) {
      const page = await browser.newPage({ viewport: target.viewport });
      if (theme === "light") {
        await page.addInitScript(
          ([key, value]) => window.localStorage.setItem(key, value),
          [THEME_STORAGE_KEY, "light"],
        );
      }
      const url = new URL(target.path, baseUrl).toString();
      const outputFileName = captureFileName(target.id, theme);
      const outputPath = path.resolve(process.cwd(), outDir, outputFileName);

      // Collected regardless of whether the caller checks them, so a capture
      // run doubles as UI standard VII's "console is clean" check for free —
      // every render defect this session found lived in this layer and none
      // of it showed up in the logic-heavy test suite.
      const consoleErrors = [];
      const onConsole = (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      };
      const onPageError = (error) => consoleErrors.push(`pageerror: ${error.message}`);
      page.on("console", onConsole);
      page.on("pageerror", onPageError);

      console.log(`Capturing ${target.id} -> ${outputPath}`);
      await page.goto(url, { waitUntil: "load" });
      await waitForCaptureReady(page, target);
      await waitForLayoutSettled(page);
      await page.screenshot({
        path: outputPath,
        fullPage: target.fullPage ?? true,
      });

      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      await page.close();

      captures.push({
        id: target.id,
        label: theme === "light" ? `${target.label} / light` : target.label,
        path: target.path,
        viewport: target.viewport,
        fullPage: target.fullPage ?? true,
        theme,
        outputPath,
        outputFileName,
        url,
        consoleErrors,
      });
    }
  } finally {
    await browser.close();
  }

  return captures;
};

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const buildCaptureGalleryHtml = ({ baseUrl, captures, generatedAt }) => {
  const cards = captures
    .map((capture) => {
      const viewportLabel = `${capture.viewport.width}x${capture.viewport.height}`;

      return `
        <article class="capture-card">
          <div class="capture-meta">
            <p class="capture-eyebrow">${escapeHtml(capture.id)}</p>
            <h2>${escapeHtml(capture.label)}</h2>
            <p><strong>Route:</strong> <code>${escapeHtml(capture.path)}</code></p>
            <p><strong>Viewport:</strong> ${escapeHtml(viewportLabel)}</p>
            <p><strong>URL:</strong> <a href="${escapeHtml(capture.url)}">${escapeHtml(capture.url)}</a></p>
          </div>
          <a class="capture-image-link" href="${escapeHtml(capture.outputFileName)}">
            <img src="${escapeHtml(capture.outputFileName)}" alt="${escapeHtml(capture.label)} screenshot" loading="lazy" />
          </a>
        </article>
      `;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Whether UI Capture Gallery</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #020617;
        --panel: rgba(15, 23, 42, 0.92);
        --panel-border: rgba(148, 163, 184, 0.18);
        --text: #e2e8f0;
        --muted: #94a3b8;
        --accent: #67e8f9;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(34, 211, 238, 0.16), transparent 28rem),
          radial-gradient(circle at top right, rgba(251, 191, 36, 0.12), transparent 24rem),
          var(--bg);
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      main {
        width: min(1440px, calc(100% - 2rem));
        margin: 0 auto;
        padding: 2rem 0 3rem;
      }

      header {
        margin-bottom: 1.5rem;
        padding: 1.5rem;
        border: 1px solid var(--panel-border);
        border-radius: 1.5rem;
        background: var(--panel);
        backdrop-filter: blur(16px);
      }

      h1, h2, p {
        margin: 0;
      }

      header h1 {
        font-size: clamp(1.8rem, 4vw, 3rem);
      }

      header p + p,
      .capture-meta p + p {
        margin-top: 0.5rem;
      }

      .meta-strip {
        margin-top: 1rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        color: var(--muted);
        font-size: 0.95rem;
      }

      .capture-grid {
        display: grid;
        gap: 1rem;
      }

      .capture-card {
        display: grid;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid var(--panel-border);
        border-radius: 1.5rem;
        background: var(--panel);
      }

      .capture-eyebrow {
        color: var(--accent);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .capture-meta {
        display: grid;
        gap: 0.35rem;
      }

      .capture-meta h2 {
        font-size: 1.25rem;
      }

      .capture-meta strong {
        color: var(--muted);
      }

      code,
      a {
        color: inherit;
      }

      .capture-image-link {
        display: block;
      }

      img {
        display: block;
        width: 100%;
        height: auto;
        border-radius: 1rem;
        border: 1px solid rgba(148, 163, 184, 0.16);
        background: rgba(15, 23, 42, 0.8);
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>Whether UI Capture Gallery</h1>
        <div class="meta-strip">
          <span><strong>Base URL:</strong> ${escapeHtml(baseUrl)}</span>
          <span><strong>Captured:</strong> ${escapeHtml(generatedAt)}</span>
          <span><strong>Targets:</strong> ${captures.length}</span>
        </div>
      </header>
      <section class="capture-grid">
        ${cards}
      </section>
    </main>
  </body>
</html>`;
};

export const writeCaptureArtifacts = async ({ baseUrl, outDir, captures, theme = "dark" }) => {
  const suffix = theme === "light" ? "-light" : "";
  const manifestPath = path.resolve(process.cwd(), outDir, `manifest${suffix}.json`);
  const galleryPath = path.resolve(process.cwd(), outDir, `index${suffix}.html`);
  const generatedAt = new Date().toISOString();

  await writeFile(
    manifestPath,
    `${JSON.stringify({ baseUrl, generatedAt, theme, captures }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    galleryPath,
    buildCaptureGalleryHtml({ baseUrl, captures, generatedAt }),
    "utf8",
  );

  return { manifestPath, galleryPath, generatedAt };
};
