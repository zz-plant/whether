/**
 * Display or control — docs/agents/ui-ux-standards.md §XXVII.
 *
 * A control changes what the page shows or goes somewhere; a display states a fact. Since
 * 2026-10-14 the action colour is the week's ink under a regime shell, the same hue as the
 * condition stamp, so the cues that tell the two apart are the only ones left and each belongs
 * to one side. This reads every component under app/ and holds four of them:
 *
 *   1. The action colour (`--accent-action`, `--accent-info`, and the sky/cyan utilities folded
 *      onto it) is drawn only by a control or by a mark inside one.
 *   2. A `hover:` change, or `cursor-pointer`, likewise: a display that answers the pointer
 *      promises a click.
 *   3. A control class (`.weather-pill`, `.weather-button`, `.weather-hub-chip`, …) sits only on
 *      a control.
 *   4. A link or button is never drawn as a stamp (`.weather-tag`, `type-stamp`, or a 2px
 *      `rounded-sm` frame): the filters on /decisions wore the verdict stamps' colours and frame.
 *
 * "Inside a control" is lexical: an element nested in a link, button, label, summary or a picker
 * part in the same file. TypeScript 7 ships no JS API, so the JSX is walked by a tokenizer that
 * skips comments, generics and void elements; `parses every component` keeps it honest by
 * requiring each file's tags to balance.
 *
 * Mockups under app/mockups are the staging area for experiments and are not scanned.
 */
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const collectComponents = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "mockups" || name === "node_modules") continue;
      collectComponents(full, out);
    } else if (name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
};

/* Comments carry tag names in prose ("a plain `<a>` with its own class chain"); blank them,
   keeping the newlines so line numbers hold. A `//` comment is taken only from the start of a
   line, so a URL inside a string survives. */
const stripComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/^\s*\/\/.*$/gm, (comment) => comment.replace(/[^\n]/g, " "));

const CONTROL_TAG =
  /^(a|Link|button|summary|label|select|textarea|input|option|UrlDetails|(?:[A-Z]\w*)?(Button|Link|Trigger|Toggle|Input|Select|Field)|[A-Z]\w*\.(Trigger|Item|Input|Close|Tab|Radio|Action|Thumb|Option|Indicator|ItemIndicator))$/;
const CONTROL_ATTR =
  /\b(role=["'](button|tab|link|radio|switch|menuitem|menuitemradio|option|slider|checkbox)["']|onClick=|href=|htmlFor=|aria-disabled=)/;
const VOID = new Set(["br", "hr", "img", "input", "meta", "link", "source", "wbr", "col"]);

/* State variants are the control speaking (`hover:text-sky-200` on a link); strip them before
   asking what the element draws at rest. */
const STATE_VARIANT =
  /(?<![\w(-])(?:hover|focus|focus-visible|focus-within|active|disabled|open|checked|peer-[\w-]+|group-[\w-]+|aria-[\w-]+|data-[\w[\]=-]+):[^\s"'`}]+/g;
const ACTION_COLOUR =
  /(?<![\w:[-])(?:text|bg|border(?:-[lrtbxy])?|decoration|fill|stroke|from|via|to|ring|outline|shadow)-(?:sky|cyan)-\d+|var\(--accent-(?:action|info)\)/;
const POINTER_CUE = /(?<![\w(\]:-])(?:group-)?hover:|(?<![\w-])cursor-pointer(?![\w-])/;
const CONTROL_CLASS =
  /(?<![\w-])weather-(?:pill|button|button-primary|cta|cta-primary|key|step-key|chip|hub-chip|choice-item)(?![\w-])/;
const STAMP_CLASS = /(?<![\w-])(?:weather-tag|type-stamp)(?![\w-])/;

type Finding = { file: string; line: number; tag: string; cue: string };

const TAG =
  /<\/([A-Za-z][\w.]*)?\s*>|(?<![\w$.)\]])<([A-Za-z][\w.]*)(?=[\s/>])(?!\s+extends\b)((?:[^<>{}]|\{(?:[^{}]|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})*\})*?)(\/?)>|<>/g;

const scanSource = (raw: string, file: string) => {
  const source = stripComments(raw);
  const findings: Finding[] = [];
  const stack: boolean[] = [];
  const lineOf = (index: number) => source.slice(0, index).split("\n").length;
  for (const match of source.matchAll(TAG)) {
    const [whole, , tag, attrs = "", selfClosing] = match;
    if (whole === "<>") {
      stack.push(false);
      continue;
    }
    if (whole.startsWith("</")) {
      stack.pop();
      continue;
    }
    if (!tag) continue;
    const isControl = CONTROL_TAG.test(tag) || CONTROL_ATTR.test(attrs);
    const insideControl = stack.some(Boolean);
    const line = lineOf(match.index ?? 0);
    if (isControl) {
      const stamp = attrs.match(STAMP_CLASS);
      if (stamp) findings.push({ file, line, tag, cue: `stamp on a control: ${stamp[0]}` });
      const classes = new Set(attrs.replace(STATE_VARIANT, "").split(/[\s"'`{}]+/));
      if (classes.has("rounded-sm") && classes.has("border")) {
        findings.push({ file, line, tag, cue: "stamp on a control: rounded-sm border" });
      }
    } else if (!insideControl) {
      const atRest = attrs.replace(STATE_VARIANT, "");
      const colour = atRest.match(ACTION_COLOUR);
      if (colour) findings.push({ file, line, tag, cue: `action colour on a display: ${colour[0]}` });
      const pointer = attrs.match(POINTER_CUE);
      if (pointer) findings.push({ file, line, tag, cue: `pointer cue on a display: ${pointer[0]}` });
      const control = attrs.match(CONTROL_CLASS);
      if (control) findings.push({ file, line, tag, cue: `control class on a display: ${control[0]}` });
    }
    if (!selfClosing && !VOID.has(tag)) stack.push(isControl || insideControl);
  }
  return { file, findings, balanced: stack.length === 0 };
};

const results = collectComponents(join(repoRoot, "app")).map((path) =>
  scanSource(readFileSync(path, "utf8"), relative(repoRoot, path)),
);

describe("display or control (§XXVII)", () => {
  it("parses every component", () => {
    const unbalanced = results.filter((result) => !result.balanced).map((result) => result.file);
    assert.deepEqual(unbalanced, [], "the tokenizer lost track of nesting in these files; the guard cannot read them");
  });

  it("draws each cue on its own side only", () => {
    const findings = results.flatMap((result) => result.findings);
    assert.deepEqual(
      findings.map((finding) => `${finding.file}:${finding.line} <${finding.tag}> ${finding.cue}`),
      [],
    );
  });

  it("catches the shapes it was written for", () => {
    const cues = (jsx: string) => scanSource(jsx, "probe.tsx").findings.map((finding) => finding.cue);
    assert.deepEqual(cues(`<p className="type-label text-sky-200">Month picked</p>`), [
      "action colour on a display: text-sky-200",
    ]);
    assert.deepEqual(cues(`<path stroke="var(--accent-action)" />`), ["action colour on a display: var(--accent-action)"]);
    assert.deepEqual(cues(`<tr className="border-b hover:bg-slate-900/30"><td>x</td></tr>`), ["pointer cue on a display: hover:"]);
    assert.deepEqual(cues(`<span className="weather-hub-chip w-fit">Tool</span>`), ["control class on a display: weather-hub-chip"]);
    assert.deepEqual(cues(`<button className="rounded-sm border px-3">Record</button>`), ["stamp on a control: rounded-sm border"]);
    // A control speaks in the action colour, and so does a mark inside one.
    assert.deepEqual(cues(`<a className="text-slate-300 hover:text-sky-200">Link</a>`), []);
    assert.deepEqual(cues(`<a href="#x" className="relative"><span className="bg-sky-300" /></a>`), []);
    // A generic is not a tag.
    assert.deepEqual(cues(`const f = <T extends string>(x: T) => useState<string>(x);`), []);
  });
});
