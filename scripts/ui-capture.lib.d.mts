import type { UiCaptureTarget } from "./ui-capture.config.mjs";

export const DEFAULT_UI_CAPTURE_BASE_URL: string;
export const DEFAULT_UI_CAPTURE_OUT_DIR: string;
export function readArgValue(args: string[], flag: string, fallback: string): string;
export function hasFlag(args: string[], flag: string): boolean;
export function resolveCaptureTargets(onlyIds?: string[]): UiCaptureTarget[];
export function listCaptureTargets(): string[];
export type CaptureTheme = "dark" | "light";
export function parseCaptureTheme(args: string[]): CaptureTheme;
export type CaptureVisitor = "first" | "returning";
export function parseCaptureVisitor(args: string[]): CaptureVisitor;
export function captureFileName(targetId: string, theme?: CaptureTheme, visitor?: CaptureVisitor): string;
export function parseCaptureOptions(args: string[]): {
  args: string[];
  baseUrl: string;
  outDir: string;
  onlyIds: string[];
  theme: CaptureTheme;
  visitor: CaptureVisitor;
  targets: UiCaptureTarget[];
};
export function probeHtmlAssetIntegrity(baseUrl: string): Promise<{
  ok: boolean;
  pageUrl: string;
  assetUrls?: string[];
  failingAssets?: string[];
  error?: string;
}>;
export function probeBaseUrl(baseUrl: string): Promise<{
  ok: boolean;
  status?: number;
  healthUrl: string;
  assetProbe: Awaited<ReturnType<typeof probeHtmlAssetIntegrity>>;
  error?: string;
  healthError?: string;
}>;
export function ensureBaseUrlReachable(baseUrl: string): Promise<Awaited<ReturnType<typeof probeBaseUrl>>>;
export function waitForCaptureReady(
  page: { waitForSelector(selector: string, options: { timeout: number }): Promise<unknown> },
  target: { path: string; readySelector?: string; readyTimeoutMs?: number; [key: string]: unknown },
): Promise<boolean>;
export function captureTargets(options: {
  baseUrl: string;
  outDir: string;
  targets: UiCaptureTarget[];
  theme?: CaptureTheme;
  visitor?: CaptureVisitor;
}): Promise<Array<{
  id: string;
  label: string;
  path: string;
  viewport: { width: number; height: number };
  fullPage: boolean;
  theme: CaptureTheme;
  visitor: CaptureVisitor;
  outputPath: string;
  outputFileName: string;
  screenFileName?: string | null;
  url: string;
  consoleErrors?: string[];
}>>;
export function buildCaptureGalleryHtml(options: {
  baseUrl: string;
  captures: Awaited<ReturnType<typeof captureTargets>>;
  generatedAt: string;
}): string;
export function writeCaptureArtifacts(options: {
  baseUrl: string;
  outDir: string;
  captures: Awaited<ReturnType<typeof captureTargets>>;
  theme?: CaptureTheme;
  visitor?: CaptureVisitor;
}): Promise<{ manifestPath: string; galleryPath: string; generatedAt: string }>;
