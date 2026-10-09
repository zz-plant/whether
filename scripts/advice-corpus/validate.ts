#!/usr/bin/env bun
/**
 * Stage 5: validation (pre-registration §7).
 *
 *   bun run advice-corpus:validate -- --sample     # draw the 160 and write each one's model input, blind
 *   bun run advice-corpus:validate -- --fresh      # after a rubric revision: 50 more, none of the 160 (D4)
 *   bun run advice-corpus:validate -- --score      # agreement between the hand labels and the model
 *   bun run advice-corpus:validate -- --spotcheck  # the 40-post audit file for the owner
 *
 * The sample's input files carry exactly what the model read (title and text, no date, firm or
 * label), so the hand labels are made on the same evidence and blind to the model.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import { readPost } from "./classify";
import { CACHE, RESEARCH_DIR, SEEDS } from "./paths";
import { buildClassifierInput, METRICS } from "./rubric";
import { readPostsFile, type PostEntry } from "./siteData";
import { cohensKappa, confusionMatrix, seededRandom, shuffled } from "./stats";

export const HAND_LABELS_PATH = join(RESEARCH_DIR, "advice-corpus-validation-labels.csv");
const SAMPLE_PATH = join(CACHE.validation, "sample.json");

const SampleSchema = z.array(z.object({ vid: z.string(), id: z.string(), source: z.string(), stratum: z.enum(["random-candidate", "random-sample", "stance-expand", "stance-conserve", "stance-craft"]) }));

/** The registered draw: 60 random candidates, 40 random sampled non-candidates, 20 each of expand, conserve and craft. */
export function drawValidationSample(posts: readonly PostEntry[], seed = SEEDS.validationSample) {
  const random = seededRandom(seed);
  const byId = [...posts].sort((a, b) => a.id.localeCompare(b.id));
  const candidates = byId.filter((post) => post.prefilter === "candidate");
  const sampled = byId.filter((post) => post.prefilter === "sample");
  const randomCandidates = shuffled(candidates, random).slice(0, 60);
  const randomSample = shuffled(sampled, random).slice(0, 40);
  const taken = new Set([...randomCandidates, ...randomSample].map((post) => post.id));
  const stratum = (stance: "expand" | "conserve" | "craft") =>
    shuffled(
      candidates.filter((post) => post.stance === stance && !taken.has(post.id)),
      random,
    ).slice(0, 20);
  const strata = [
    ...randomCandidates.map((post) => ({ post, stratum: "random-candidate" as const })),
    ...randomSample.map((post) => ({ post, stratum: "random-sample" as const })),
    ...stratum("expand").map((post) => ({ post, stratum: "stance-expand" as const })),
    ...stratum("conserve").map((post) => ({ post, stratum: "stance-conserve" as const })),
    ...stratum("craft").map((post) => ({ post, stratum: "stance-craft" as const })),
  ];
  // Present in a shuffled order so the reviewer cannot read a stratum off the position.
  return shuffled(strata, random).map((entry, index) => ({
    vid: `V${String(index + 1).padStart(3, "0")}`,
    id: entry.post.id,
    source: entry.post.source,
    stratum: entry.stratum,
  }));
}

const FRESH_PATH = join(CACHE.validation, "fresh.json");
const FreshSchema = z.array(z.object({ vid: z.string(), id: z.string(), source: z.string() }));
export const FRESH_SEED = 20261013;

/** D4's check on the revision: 50 classified posts at random, none of them in the first 160. */
export function drawFreshSample(posts: readonly PostEntry[], exclude: ReadonlySet<string>, seed = FRESH_SEED) {
  const pool = [...posts].sort((a, b) => a.id.localeCompare(b.id)).filter((post) => !exclude.has(post.id));
  return shuffled(pool, seededRandom(seed))
    .slice(0, 50)
    .map((post, index) => ({ vid: `F${String(index + 1).padStart(3, "0")}`, id: post.id, source: post.source }));
}

const HandLabelSchema = z.object({
  vid: z.string(),
  capital_relevant: z.enum(["true", "false"]),
  audience: z.enum(["founders", "lps", "general"]),
  stance: z.enum(["expand", "conserve", "craft", "none"]),
  efficiency_metric: z.enum(["true", "false"]),
  growth_metric: z.enum(["true", "false"]),
});

/** A minimal CSV reader for the hand-label file: a header row, quoted fields allowed. */
export function parseCsv(source: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.filter((cells) => cells.some(Boolean)).map((cells) => Object.fromEntries(header.map((name, index) => [name, cells[index] ?? ""])));
}

export const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

const hasFamily = (metrics: readonly string[], family: "growth" | "efficiency") =>
  metrics.some((metric) => Object.entries(METRICS).some(([key, value]) => key === metric && value === family));

function score() {
  const postsFile = readPostsFile();
  const byId = new Map(postsFile.posts.map((post) => [post.id, post]));
  const sample = SampleSchema.parse(JSON.parse(readFileSync(SAMPLE_PATH, "utf8")));
  const hand = new Map(parseCsv(readFileSync(HAND_LABELS_PATH, "utf8")).map((row) => {
    const parsed = HandLabelSchema.parse(row);
    return [parsed.vid, parsed];
  }));
  type Pair = { stratum: string; hand: z.infer<typeof HandLabelSchema>; model: PostEntry };
  const pairs: Pair[] = [];
  for (const item of sample) {
    const label = hand.get(item.vid);
    const model = byId.get(item.id);
    if (label && model) pairs.push({ stratum: item.stratum, hand: label, model });
  }
  const freshPairs: Pair[] = [];
  if (existsSync(FRESH_PATH)) {
    for (const item of FreshSchema.parse(JSON.parse(readFileSync(FRESH_PATH, "utf8")))) {
      const label = hand.get(item.vid);
      const model = byId.get(item.id);
      if (label && model) freshPairs.push({ stratum: "fresh", hand: label, model });
    }
  }
  const report = (subset: Pair[], name: string) => {
    const stance = cohensKappa(subset.map((pair) => pair.hand.stance), subset.map((pair) => pair.model.stance));
    const capital = cohensKappa(subset.map((pair) => pair.hand.capital_relevant), subset.map((pair) => String(pair.model.capitalRelevant)));
    const audience = cohensKappa(subset.map((pair) => pair.hand.audience), subset.map((pair) => pair.model.audience));
    const efficiency = cohensKappa(subset.map((pair) => pair.hand.efficiency_metric), subset.map((pair) => String(hasFamily(pair.model.metrics, "efficiency"))));
    const growth = cohensKappa(subset.map((pair) => pair.hand.growth_metric), subset.map((pair) => String(hasFamily(pair.model.metrics, "growth"))));
    return { name, n: subset.length, stance, capital, audience, efficiency, growth };
  };
  const all = report(pairs, "all");
  const randomOnly = report(pairs.filter((pair) => pair.stratum.startsWith("random")), "random 100");
  const fresh = freshPairs.length > 0 ? report(freshPairs, "fresh 50") : null;
  const stances = ["expand", "conserve", "craft", "none"] as const;
  const matrix = confusionMatrix(pairs.map((pair) => pair.hand.stance), pairs.map((pair) => pair.model.stance), stances);
  const handNonCandidates = pairs.filter((pair) => pair.stratum === "random-sample");
  const sampledPosts = postsFile.posts.filter((post) => post.prefilter === "sample");
  const result = {
    promptVersion: postsFile.promptVersion,
    all,
    randomOnly,
    fresh,
    freshStanceConfusion: confusionMatrix(freshPairs.map((pair) => pair.hand.stance), freshPairs.map((pair) => pair.model.stance), stances),
    stanceConfusion: { rows: "hand", columns: "model", categories: stances, matrix },
    capitalConfusion: confusionMatrix(pairs.map((pair) => pair.hand.capital_relevant), pairs.map((pair) => String(pair.model.capitalRelevant)), ["true", "false"]),
    prefilterMiss: {
      modelSampled: sampledPosts.length,
      modelCapital: sampledPosts.filter((post) => post.capitalRelevant).length,
      modelCapitalFounders: sampledPosts.filter((post) => post.capitalRelevant && post.audience === "founders").length,
      handSampled: handNonCandidates.length,
      handCapital: handNonCandidates.filter((pair) => pair.hand.capital_relevant === "true").length,
    },
    disagreements: pairs
      .filter((pair) => pair.hand.stance !== pair.model.stance)
      .map((pair) => ({ vid: sample.find((item) => item.id === pair.model.id)?.vid, hand: pair.hand.stance, model: pair.model.stance, title: pair.model.title })),
  };
  console.log(JSON.stringify(result, null, 1));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--sample")) {
    const postsFile = readPostsFile();
    const sample = drawValidationSample(postsFile.posts);
    const itemsDirectory = join(CACHE.validation, "items");
    mkdirSync(itemsDirectory, { recursive: true });
    for (const item of sample) {
      const post = readPost(item.source, item.id);
      writeFileSync(join(itemsDirectory, `${item.vid}.txt`), buildClassifierInput(post.title, post.text));
    }
    writeFileSync(SAMPLE_PATH, JSON.stringify(sample, null, 1));
    console.log(`[validate] ${sample.length} items in ${itemsDirectory}`);
    return;
  }
  if (args.includes("--fresh")) {
    const postsFile = readPostsFile();
    const first = new Set(SampleSchema.parse(JSON.parse(readFileSync(SAMPLE_PATH, "utf8"))).map((item) => item.id));
    const fresh = drawFreshSample(postsFile.posts, first);
    const itemsDirectory = join(CACHE.validation, "items");
    mkdirSync(itemsDirectory, { recursive: true });
    for (const item of fresh) {
      const post = readPost(item.source, item.id);
      writeFileSync(join(itemsDirectory, `${item.vid}.txt`), buildClassifierInput(post.title, post.text));
    }
    writeFileSync(FRESH_PATH, JSON.stringify(fresh, null, 1));
    console.log(`[validate] ${fresh.length} fresh items in ${itemsDirectory}`);
    return;
  }
  if (args.includes("--score")) {
    if (!existsSync(HAND_LABELS_PATH)) throw new Error(`no hand labels at ${HAND_LABELS_PATH}`);
    score();
    return;
  }
  if (args.includes("--spotcheck")) {
    const postsFile = readPostsFile();
    const picked = shuffled(
      [...postsFile.posts].sort((a, b) => a.id.localeCompare(b.id)),
      seededRandom(SEEDS.spotcheck),
    ).slice(0, 40);
    const header = "url,title,firm,month,prefilter,capital_relevant,audience,stance,metrics,confidence,evidence";
    const lines = picked
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((post) =>
        [post.url, post.title, post.firm, post.month, post.prefilter, String(post.capitalRelevant), post.audience, post.stance, post.metrics.join(" "), post.confidence, post.evidence]
          .map(csvCell)
          .join(","),
      );
    writeFileSync(join(RESEARCH_DIR, "advice-corpus-spotcheck.csv"), `${[header, ...lines].join("\n")}\n`);
    console.log(`[validate] wrote ${picked.length} rows to docs/research/advice-corpus-spotcheck.csv`);
  }
}

if (import.meta.main) main();
