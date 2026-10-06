export type UiCaptureTarget = {
  id: string;
  label: string;
  path: string;
  viewport: { width: number; height: number };
  fullPage?: boolean;
  deviceScaleFactor?: number;
  firstScreen?: boolean;
  readySelector?: string;
  readyTimeoutMs?: number;
};

export const galleryTitle: string;
export const healthPath: string;
/** Pathname -> the element that marks the route's streamed content arrived. */
export const streamedContentReadySelectors: Map<string, string>;
/** ISO-8601 week slug (`2026-w41`), the same answer as lib/isoWeek.ts. */
export function isoWeekSlug(date: Date): string;
/** The localStorage entries a capture seeds before the page's first script, in order. */
export function captureStorageSeeds(options: {
  theme: "dark" | "light";
  visitor: "first" | "returning";
  now?: number;
}): Array<[string, string]>;
export const uiCaptureTargets: UiCaptureTarget[];
