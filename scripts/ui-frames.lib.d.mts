import type { FrameFact } from "./ui-capture.config.mjs";

export type MeasuredFrame = {
  index: number;
  y: number;
  site: boolean;
  dated: boolean;
  condition: boolean;
};
export type FrameBlock = { label: string; height: number };

export function frameOffsets(pageHeight: number, frameHeight: number, maxFrames?: number): number[];
export function tallBlocks<T extends FrameBlock>(blocks: T[], usableHeight: number): T[];
export function frameGaps(frame: Pick<MeasuredFrame, "site" | "dated" | "condition">, requires?: FrameFact[]): FrameFact[];
export function routeFailures(route: {
  frames: MeasuredFrame[];
  tall: Array<FrameBlock & { usableHeight: number }>;
  requires?: FrameFact[];
}): string[];
export function buildFramesGalleryHtml(options: { baseUrl: string; routes: unknown[]; generatedAt: string }): string;
