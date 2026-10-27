/**
 * The version id Wrangler prints once an upload has actually landed, or null when the
 * output carries no such evidence — which is what a deploy that exited 0 without
 * publishing looks like.
 */
export function findPublishedVersionId(output: string | undefined | null): string | null;

/**
 * A line filter that replaces each box-drawn module table Wrangler prints with its row
 * count, and passes every other line through as it arrives.
 */
export function createModuleTableFilter(emit: (text: string) => void): {
  write(chunk: string): void;
  end(): void;
};
