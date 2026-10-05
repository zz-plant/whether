/**
 * Loader for the generated posture archive index.
 *
 * Regenerate with `bun run archive:index` after the summary archive changes.
 */
import rawIndex from "../../data/posture_archive_index.json";
import { PostureArchiveIndexSchema, type PostureArchivePeriod } from "./postureArchiveTypes";

export type { PostureArchivePeriod } from "./postureArchiveTypes";

export const parsePostureArchiveIndex = (input: unknown): PostureArchivePeriod[] => {
  const parsed = PostureArchiveIndexSchema.safeParse(input);

  if (parsed.success) {
    return parsed.data;
  }

  console.error("Posture archive index failed validation.", parsed.error.format());
  return [];
};

const periods = parsePostureArchiveIndex(rawIndex);

const periodBySlug = new Map(periods.map((period) => [period.slug, period]));

export const getPostureArchivePeriods = () => periods;

export const findPostureArchivePeriod = (slug: string) => periodBySlug.get(slug);

export const isPostureArchiveSlug = (slug: string) => periodBySlug.has(slug);

export const postureArchiveStaticParams = periods.map((period) => ({ period: period.slug }));

export { buildPostureArchivePath, postureArchiveYears } from "./postureArchiveYears";
