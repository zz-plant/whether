import assert from "node:assert/strict";

/*
 * Structured data mirrors what is visible (docs/seo/quality-gates.md, "Semantic gates"): a page
 * whose sections are questions and answers carries them as `Question` / `acceptedAnswer` nodes
 * with the same words, and nothing is marked up that the page does not show. These read every
 * Question node out of a page's JSON-LD and look for its words in the page's rendered text.
 */

type Node = Record<string, unknown>;
type QuestionNode = { name: string; acceptedAnswer: { text: string } };

const isQuestion = (value: unknown): value is QuestionNode =>
  Boolean(value) &&
  typeof value === "object" &&
  (value as Node)["@type"] === "Question" &&
  typeof (value as Node).name === "string" &&
  typeof ((value as Node).acceptedAnswer as Node | undefined)?.text === "string";

/** Every `Question` node anywhere in a JSON-LD document, however deep. */
export const questionNodesIn = (jsonLd: unknown): QuestionNode[] => {
  const found: QuestionNode[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") {
      if (isQuestion(value)) found.push(value);
      Object.values(value).forEach(walk);
    }
  };
  walk(jsonLd);
  return found;
};

/** Every JSON-LD document a rendered page carries, parsed. */
export const jsonLdIn = (html: string): unknown[] =>
  [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) =>
    JSON.parse(match[1] ?? "null"),
  );

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** The text a reader sees: tags dropped, entities decoded, runs of space collapsed. */
export const visibleTextOf = (html: string) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/g, " ")
    .replace(/<style\b[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\s+/g, " ");

/** Each Question node's question and answer are words the rendered page prints. */
export const assertQuestionsVisible = (jsonLd: unknown, html: string, { atLeast = 1 } = {}) => {
  const questions = questionNodesIn(jsonLd);
  assert.ok(questions.length >= atLeast, `expected at least ${atLeast} Question nodes, found ${questions.length}`);
  const text = visibleTextOf(html);
  for (const question of questions) {
    assert.ok(text.includes(question.name), `the page does not print the question "${question.name}"`);
    assert.ok(
      text.includes(question.acceptedAnswer.text.replace(/\s+/g, " ")),
      `the page does not print the answer to "${question.name}": "${question.acceptedAnswer.text}"`,
    );
  }
  return questions;
};
