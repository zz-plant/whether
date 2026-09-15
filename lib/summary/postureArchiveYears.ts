/**
 * Year-level entry points for the posture archive, newest first.
 *
 * Deliberately split from `postureArchive.ts` so client components can link the
 * archive without pulling the full period index into their bundle.
 */
import { z } from "zod";
import rawYears from "../../data/posture_archive_years.json";

const PostureArchiveYearSchema = z.object({
  slug: z.string(),
  title: z.string(),
  operatorLabel: z.string(),
});

type PostureArchiveYear = z.infer<typeof PostureArchiveYearSchema>;

const parsePostureArchiveYears = (input: unknown): PostureArchiveYear[] => {
  const parsed = z.array(PostureArchiveYearSchema).safeParse(input);

  if (parsed.success) {
    return parsed.data;
  }

  console.error("Posture archive year index failed validation.", parsed.error.format());
  return [];
};

export const postureArchiveYears = parsePostureArchiveYears(rawYears);

export const buildPostureArchivePath = (slug: string) => `/history/${slug}` as const;
