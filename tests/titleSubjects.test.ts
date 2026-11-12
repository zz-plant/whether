import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/*
 * A title gives a person's verb only to a person (docs/editorial-guardrails.md, Headings).
 *
 * A brief, a filing, a record, a reading or a blog post cannot say, tell, warn, think or
 * want anything. A title that has one do it reads as the thing having a mind, and it
 * blurs who did act: whoever wrote the filing, the people who published the brief, the
 * reader. Found 2026-11-12: "{company}: what its filings say about hiring and spending",
 * "What did the brief say in an earlier month?", a fact labelled "Warned a month ahead"
 * (the readings warned) and a legend reading "Told founders to grow faster" (the posts
 * told). Each now names the thing, or the fact, without a verb it cannot do.
 *
 * Read from the source: every string a title is built from, under the keys and props that
 * carry one (a page title, a heading, a section label, an instrument's question, a fact's
 * label), the text of an h1 to h3, and the same keys in `content/`. The subjects are the
 * site's own things; a person's verb on a person ("Sales says…", "a board trusts…", "you
 * know…") passes. A title that opens on a past-tense speech verb has no subject at all, so
 * the reader supplies the nearest thing, and fails too.
 */

const THINGS =
  "brief|briefs|guidance|filing|filings|record|records|data|reading|readings|signal|signals|score|scores|rate|rates|curve|chart|charts|page|pages|site|model|formula|post|posts|essay|essays|advice|band|line|lines|report|reports|index|gauge|number|numbers";
const PERSON_VERBS =
  "say|says|said|tell|tells|told|think|thinks|thought|know|knows|knew|want|wants|wanted|warn|warns|warned|decide|decides|decided|believe|believes|expect|expects|ask|asks|asked|agree|agrees|feel|feels|hope|hopes|worry|worries|recommend|recommends|suggest|suggests|advise|advises|teach|teaches|taught|admit|admits|promise|promises|insist|insists|prefer|prefers|refuse|refuses|trust|trusts|doubt|doubts|fear|fears|blame|blames|urge|urges|urged";
const MODAL = "(?:still|already|now|also|did|does|do|will|would|can|could|may|might|should)";

/* "its filings say", "the record still knows" */
const THING_THEN_VERB = new RegExp(`\\b(?:${THINGS})\\b(?:\\s+${MODAL})?\\s+(?:${PERSON_VERBS})\\b`, "i");
/* "did the brief say", "would the data want" */
const QUESTION_FORM = new RegExp(`\\b${MODAL}\\s+(?:the|its|this|these|that|our|their|a|an)\\s+(?:\\w+\\s+)?(?:${THINGS})\\s+(?:${PERSON_VERBS})\\b`, "i");
/* "Warned a month ahead", "Told founders to grow faster": no subject, so the nearest thing is one.
   Speech verbs only: "Recommended tools" is a participle on a noun, not a clause. */
const SUBJECTLESS_SPEECH = /^(?:told|warned|taught|said|asked|urged)\b/i;

const TITLE_KEYS = ["title", "pageTitle", "heading", "subject", "sectionTitle", "headline", "question", "label", "eyebrow"];
const KEY_VALUE = new RegExp(
  `\\b(?:${TITLE_KEYS.join("|")}|[A-Za-z]*(?:Title|TITLE|Heading|HEADING))\\s*[:=]\\s*\\{?\\s*(["'\`])((?:(?!\\1).){3,160})\\1`,
  "g",
);
const HEADING_TEXT = /<(h[1-3])\b[^>]*>([^<{}]{3,160})<\/\1>/g;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [path] : [];
  });

const titlesInSource = (): Array<{ where: string; title: string }> =>
  ["app", "lib"].flatMap(sourceFiles).flatMap((path) => {
    const text = readFileSync(path, "utf8");
    const at = (index: number) => `${path}:${text.slice(0, index).split("\n").length}`;
    return [
      ...Array.from(text.matchAll(KEY_VALUE), (match) => ({ where: at(match.index ?? 0), title: match[2] ?? "" })),
      ...Array.from(text.matchAll(HEADING_TEXT), (match) => ({ where: at(match.index ?? 0), title: match[2] ?? "" })),
    ];
  });

const titlesInContent = (): Array<{ where: string; title: string }> => {
  const found: Array<{ where: string; title: string }> = [];
  const walk = (node: unknown, where: string, key?: string) => {
    if (Array.isArray(node)) node.forEach((item) => walk(item, where, key));
    else if (node && typeof node === "object") Object.entries(node).forEach(([childKey, value]) => walk(value, where, childKey));
    else if (typeof node === "string" && key && TITLE_KEYS.includes(key)) found.push({ where: `${where} (${key})`, title: node });
  };
  for (const dir of ["content/answers", "content/resources"]) {
    for (const name of readdirSync(dir).filter((file) => file.endsWith(".json"))) {
      walk(JSON.parse(readFileSync(join(dir, name), "utf8")), join(dir, name));
    }
  }
  return found;
};

const givesAThingAPersonsVerb = (title: string) => {
  const text = title.replace(/\$\{[^}]*\}/g, "X").replace(/\s+/g, " ").trim();
  return THING_THEN_VERB.test(text) || QUESTION_FORM.test(text) || SUBJECTLESS_SPEECH.test(text);
};

describe("a title gives a person's verb only to a person", () => {
  it("catches the shapes it was written for, and passes a person doing the same", () => {
    for (const bad of [
      "Acme: what its filings say about hiring and spending",
      "What did the brief say in an earlier month?",
      "Warned a month ahead",
      "Told founders to grow faster",
      "The data wants a lower rate",
    ]) {
      assert.ok(givesAThingAPersonsVerb(bad), bad);
    }
    for (const good of [
      "Acme: hiring and spending in its filings",
      "What was the guidance in an earlier month?",
      "Near the line the month before",
      "Advice to grow faster",
      "Sales says we need this for renewals",
      "Recommended tools",
      "Closing note: why a board trusts a decision it can undo",
      "What the record shows",
      "How do we know a market is ready?",
    ]) {
      assert.ok(!givesAThingAPersonsVerb(good), good);
    }
  });

  it("holds for every title in the app, the library and the content files", () => {
    const offenders = [...titlesInSource(), ...titlesInContent()].filter(({ title }) => givesAThingAPersonsVerb(title));
    assert.deepEqual(
      offenders.map(({ where, title }) => `${where}: ${title}`),
      [],
      "name the thing, or the fact, without a verb it cannot do",
    );
  });
});
