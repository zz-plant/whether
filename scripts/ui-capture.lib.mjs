import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { uiCaptureTargets } from "./ui-capture.config.mjs";

export const DEFAULT_UI_CAPTURE_BASE_URL =
  process.env.UI_CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";
export const DEFAULT_UI_CAPTURE_OUT_DIR = "artifacts/ui";
const HTML_ASSET_PATTERN = /<(?:link|script)\b[^>]+(?:href|src)="([^"]+)"/gi;

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

export const parseCaptureOptions = (args) => {
  const onlyIds = parseOnlyIds(readArgValue(args, "--only", ""));

  return {
    args,
    baseUrl: readArgValue(args, "--base-url", DEFAULT_UI_CAPTURE_BASE_URL),
    outDir: readArgValue(args, "--out-dir", DEFAULT_UI_CAPTURE_OUT_DIR),
    onlyIds,
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
  } catch (error) {
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

export const captureTargets = async ({ baseUrl, outDir, targets }) => {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const captures = [];

  try {
    for (const target of targets) {
      const page = await browser.newPage({ viewport: target.viewport });
      const url = new URL(target.path, baseUrl).toString();
      const outputPath = path.resolve(process.cwd(), outDir, `${target.id}.png`);

      console.log(`Capturing ${target.id} -> ${outputPath}`);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.screenshot({
        path: outputPath,
        fullPage: target.fullPage ?? true,
      });
      await page.close();

      captures.push({
        id: target.id,
        label: target.label,
        path: target.path,
        viewport: target.viewport,
        fullPage: target.fullPage ?? true,
        outputPath,
        outputFileName: `${target.id}.png`,
        url,
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

export const writeCaptureArtifacts = async ({ baseUrl, outDir, captures }) => {
  const manifestPath = path.resolve(process.cwd(), outDir, "manifest.json");
  const galleryPath = path.resolve(process.cwd(), outDir, "index.html");
  const generatedAt = new Date().toISOString();

  await writeFile(
    manifestPath,
    `${JSON.stringify({ baseUrl, generatedAt, captures }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    galleryPath,
    buildCaptureGalleryHtml({ baseUrl, captures, generatedAt }),
    "utf8",
  );

  return { manifestPath, galleryPath, generatedAt };
};
