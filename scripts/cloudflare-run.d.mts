/**
 * The version id Wrangler prints once an upload has actually landed, or null when the
 * output carries no such evidence — which is what a deploy that exited 0 without
 * publishing looks like.
 */
export function findPublishedVersionId(output: string | undefined | null): string | null;
