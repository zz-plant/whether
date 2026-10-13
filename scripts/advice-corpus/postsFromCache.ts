/**
 * posts.json from the local cache: the prefilter's selection, the local model's labels and
 * each post's metadata. Text never leaves the cache; the file carries the evidence quote
 * (at most 15 words) and whether it is verbatim.
 */
import { readFileSync } from "node:fs";
import { z } from "zod";

import { labelsPath, readLabelRecords, readPost } from "./classify";
import { CACHE, LOCAL_CHAT_MODEL } from "./paths";
import { buildClassifierInput, isVerbatim, PROMPT_VERSION } from "./rubric";
import { FIRST_MONTH, LAST_MONTH, type PostEntry, type PostsFile } from "./siteData";

const PrefilterSchema = z.object({
  corpus: z.number(),
  counts: z.record(z.string(), z.number()),
  bySource: z.record(z.string(), z.record(z.string(), z.number())),
  k: z.number(),
  nonCandidates: z.number(),
  sampled: z.number(),
  selected: z.array(z.object({ id: z.string(), source: z.string(), prefilter: z.enum(["candidate", "sample"]) })),
});

export function readPrefilter() {
  return PrefilterSchema.parse(JSON.parse(readFileSync(CACHE.prefilter, "utf8")));
}

export function buildPostsFile(): PostsFile {
  const prefilter = readPrefilter();
  const records = new Map(readLabelRecords(labelsPath()).map((record) => [record.id, record]));
  const posts: PostEntry[] = [];
  let failed = 0;
  for (const target of prefilter.selected) {
    const record = records.get(target.id);
    if (!record?.label) {
      failed += 1;
      continue;
    }
    const post = readPost(target.source, target.id);
    const label = record.label;
    posts.push({
      id: post.id,
      url: post.url,
      title: post.title,
      source: post.source,
      firm: post.firm,
      author: post.author,
      month: post.month,
      prefilter: target.prefilter,
      capitalRelevant: label.capitalRelevant,
      audience: label.audience,
      stance: label.stance,
      metrics: label.metrics,
      confidence: label.confidence,
      evidence: label.evidence,
      evidenceVerbatim: label.evidence === "" ? false : isVerbatim(label.evidence, buildClassifierInput(post.title, post.text)),
    });
  }
  posts.sort((a, b) => a.month.localeCompare(b.month) || a.id.localeCompare(b.id));
  const bySource = new Map<string, Record<string, number>>();
  for (const [source, counts] of Object.entries(prefilter.bySource)) {
    const selected = prefilter.selected.filter((target) => target.source === source);
    bySource.set(source, {
      ...counts,
      candidates: selected.filter((target) => target.prefilter === "candidate").length,
      sampled: selected.filter((target) => target.prefilter === "sample").length,
      classified: posts.filter((post) => post.source === source).length,
    });
  }
  return {
    study: "advice-corpus",
    promptVersion: PROMPT_VERSION,
    labelModel: LOCAL_CHAT_MODEL,
    window: { first: FIRST_MONTH, last: LAST_MONTH },
    counts: {
      ...prefilter.counts,
      candidates: prefilter.k,
      nonCandidates: prefilter.nonCandidates,
      sampled: prefilter.sampled,
      selected: prefilter.selected.length,
      classified: posts.length,
      failed,
    },
    bySource: Object.fromEntries(bySource),
    posts,
  };
}
