/**
 * The weekly call as a picture, taken by Browser Rendering and kept in KV.
 *
 * The product calls itself a Slack screenshot product and ships a screenshot mode
 * (`?screenshot=1`, app/components/ScreenshotDetector.tsx) built for a person to capture,
 * yet the Monday Slack post was text blocks and nothing captured the page for it. This
 * module asks Cloudflare's screenshot endpoint for the weekly-call block in that mode once
 * a week, stores the PNG under the record date, and hands the Slack delivery a public URL
 * for an image block. The satori-rendered card at /api/image/brief stays for link unfurls;
 * this is the real hero, as rendered.
 *
 * Every piece is optional: without CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_BROWSER_RENDERING_TOKEN
 * the step reports itself skipped and the post goes out as it always has.
 *
 * This is the one place the cron reaches its own public URL, and it does so through a
 * browser rather than a fetch: a picture needs the page as served, and there is no library
 * call that returns pixels. The data steps keep the AGENTS.md invariant — none of them
 * fetches a public endpoint for what a direct call can give them.
 */
import { getWhetherKv, type KvNamespace } from "../runtime/kv";
import { resolveSiteUrl } from "../siteUrl";

const BRIEF_SCREENSHOT_ROUTE = "/api/image/brief-screenshot";
const BRIEF_SCREENSHOT_KEY_PREFIX = "artifact:brief-screenshot:";
export const BRIEF_SCREENSHOT_LATEST_KEY = `${BRIEF_SCREENSHOT_KEY_PREFIX}latest`;
/** Two months keeps the current quarter's posts resolvable; the archive page is the permanent record. */
export const BRIEF_SCREENSHOT_TTL_SECONDS = 60 * 24 * 60 * 60;
/** The weekly-call block on the homepage (app/page.tsx), which screenshot mode leaves visible. */
export const BRIEF_SCREENSHOT_SELECTOR = "#weekly-call";

export const isRecordDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

type BrowserRenderingConfig = { accountId: string; token: string };

const readSetting = (name: string): string | null => {
  const fromBinding: unknown = Reflect.get(globalThis, name);
  if (typeof fromBinding === "string" && fromBinding.trim() !== "") return fromBinding.trim();
  const fromEnv = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return typeof fromEnv === "string" && fromEnv.trim() !== "" ? fromEnv.trim() : null;
};

const resolveBrowserRenderingConfig = (): BrowserRenderingConfig | null => {
  const accountId = readSetting("CLOUDFLARE_ACCOUNT_ID");
  const token = readSetting("CLOUDFLARE_BROWSER_RENDERING_TOKEN");
  return accountId && token ? { accountId, token } : null;
};

/** The body for POST /accounts/{id}/browser-rendering/screenshot, kept in one place so a test can pin it. */
const buildScreenshotRequest = (siteUrl: string) => ({
  url: `${siteUrl}/?screenshot=1`,
  selector: BRIEF_SCREENSHOT_SELECTOR,
  viewport: { width: 1200, height: 900, deviceScaleFactor: 2 },
  gotoOptions: { waitUntil: "networkidle0", timeout: 30_000 },
  screenshotOptions: { type: "png", omitBackground: false },
});

type CaptureResult = { ok: true; png: Uint8Array } | { ok: false; reason: string };

const captureBriefScreenshot = async ({
  fetcher = fetch,
  config,
  siteUrl = resolveSiteUrl(),
}: {
  fetcher?: typeof fetch;
  config: BrowserRenderingConfig;
  siteUrl?: string;
}): Promise<CaptureResult> => {
  let response: Response;
  try {
    response = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/browser-rendering/screenshot`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
        body: JSON.stringify(buildScreenshotRequest(siteUrl)),
      },
    );
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "screenshot request failed" };
  }

  if (!response.ok) {
    return { ok: false, reason: `Browser Rendering answered HTTP ${response.status}` };
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return { ok: false, reason: `Browser Rendering answered ${contentType || "no content type"}, not an image` };
  }
  const png = new Uint8Array(await response.arrayBuffer());
  if (png.byteLength === 0) {
    return { ok: false, reason: "Browser Rendering answered an empty image" };
  }
  return { ok: true, png };
};

/* KV values are strings here (lib/runtime/kv.ts types them so on purpose), so the PNG
   travels as base64. A 1200px card at 2x is a few hundred kilobytes; the value limit is 25MB. */
const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
};

/* Typed over a plain ArrayBuffer so the route can hand the bytes straight to `Response`. */
const base64ToBytes = (encoded: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export const briefScreenshotUrl = (recordDate: string, siteUrl = resolveSiteUrl()) =>
  `${siteUrl}${BRIEF_SCREENSHOT_ROUTE}?date=${encodeURIComponent(recordDate)}`;

const storeBriefScreenshot = async (
  kv: Pick<KvNamespace, "put">,
  recordDate: string,
  png: Uint8Array,
): Promise<void> => {
  await kv.put(BRIEF_SCREENSHOT_KEY_PREFIX + recordDate, bytesToBase64(png), { expirationTtl: BRIEF_SCREENSHOT_TTL_SECONDS });
  await kv.put(BRIEF_SCREENSHOT_LATEST_KEY, recordDate, { expirationTtl: BRIEF_SCREENSHOT_TTL_SECONDS });
};

/** The stored PNG for a record date, or for "latest"; null when nothing is stored. */
export const readBriefScreenshot = async (
  date: string,
  kv: Pick<KvNamespace, "get"> | null = getWhetherKv(),
): Promise<Uint8Array<ArrayBuffer> | null> => {
  if (!kv) return null;
  const recordDate = date === "latest" ? await kv.get(BRIEF_SCREENSHOT_LATEST_KEY) : date;
  if (!recordDate || !isRecordDate(recordDate)) return null;
  const encoded = await kv.get(BRIEF_SCREENSHOT_KEY_PREFIX + recordDate);
  if (!encoded) return null;
  try {
    return base64ToBytes(encoded);
  } catch {
    return null;
  }
};

type BriefScreenshotStepResult = {
  ok: boolean;
  status: "stored" | "skipped_unconfigured" | "failed";
  imageUrl?: string;
  recordDate: string;
  error?: string;
};

/** The Monday cron step: capture, store, and name the URL the Slack post can embed. */
export const captureAndStoreBriefScreenshot = async ({
  recordDate,
  fetcher,
  config = resolveBrowserRenderingConfig(),
  kv = getWhetherKv(),
  siteUrl = resolveSiteUrl(),
}: {
  recordDate: string;
  fetcher?: typeof fetch;
  config?: BrowserRenderingConfig | null;
  kv?: Pick<KvNamespace, "put"> | null;
  siteUrl?: string;
}): Promise<BriefScreenshotStepResult> => {
  if (!config) {
    /* Not configured is a real state, not a failure — and never a stored image. */
    return { ok: true, status: "skipped_unconfigured", recordDate };
  }
  if (!isRecordDate(recordDate)) {
    return { ok: false, status: "failed", recordDate, error: `record date "${recordDate}" is not YYYY-MM-DD` };
  }
  if (!kv) {
    return { ok: false, status: "failed", recordDate, error: "no KV binding to store the image" };
  }

  const captured = await captureBriefScreenshot({ fetcher, config, siteUrl });
  if (!captured.ok) {
    return { ok: false, status: "failed", recordDate, error: captured.reason };
  }

  try {
    await storeBriefScreenshot(kv, recordDate, captured.png);
  } catch (error) {
    return { ok: false, status: "failed", recordDate, error: error instanceof Error ? error.message : "store failed" };
  }

  return { ok: true, status: "stored", recordDate, imageUrl: briefScreenshotUrl(recordDate, siteUrl) };
};
