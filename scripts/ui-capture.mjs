import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { uiCaptureTargets } from "./ui-capture.config.mjs";

const args = process.argv.slice(2);

const readArgValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : fallback;
};

const hasFlag = (flag) => args.includes(flag);

const baseUrl = readArgValue("--base-url", process.env.UI_CAPTURE_BASE_URL ?? "http://localhost:3000");
const outDir = readArgValue("--out-dir", "artifacts/ui");
const onlyValue = readArgValue("--only", "");
const onlyIds = onlyValue
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const targets = onlyIds.length > 0
  ? uiCaptureTargets.filter((target) => onlyIds.includes(target.id))
  : [...uiCaptureTargets];

if (targets.length === 0) {
  console.error("No UI capture targets matched `--only`.");
  process.exit(1);
}

if (hasFlag("--list")) {
  for (const target of uiCaptureTargets) {
    console.log(`${target.id}\t${target.label}\t${target.path}`);
  }
  process.exit(0);
}

const ensureBaseUrlReachable = async () => {
  try {
    const response = await fetch(baseUrl, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Received ${response.status}`);
    }
  } catch (error) {
    console.error(`UI capture could not reach ${baseUrl}.`);
    console.error("Start the app first with `bun run dev`, or pass `--base-url`.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

const run = async () => {
  await ensureBaseUrlReachable();
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();

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
    }
  } finally {
    await browser.close();
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
