import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { describe, it } from "bun:test";
import { walkFiles } from "../scripts/walk-files.mjs";

/*
 * Tailwind finds classes by scanning source text, and it splits candidates on
 * whitespace and quotes, not on `${`. A class written flush against an
 * interpolation — `max-md:py-3${moved ? …}` — reaches the scanner as one token
 * it cannot parse, so the class is never generated. Nothing fails: the class
 * stays in the markup and simply does nothing, unless the same class happens
 * to be written somewhere else in the tree.
 *
 * That is how the brief's area table lost its phone row padding on
 * 2026-10-08: `max-md:py-3` appeared once, glued to the moved-row tint, and
 * the rows ran into each other. Four more sites had the same shape and were
 * saved only by the class being used elsewhere.
 */
const APP_DIR = new URL("../app/", import.meta.url).pathname;

/* A class's last character (a letter, digit, `]`, `)` or `%`) directly before `${`. */
const GLUED = /[A-Za-z0-9\])%]\$\{/;

const classTemplates = (source: string) => {
  const found: string[] = [];
  let from = 0;
  for (;;) {
    const start = source.indexOf("className={`", from);
    if (start === -1) return found;
    /* The template closes at the first backtick followed by `}`; a nested
       template inside it closes before a space, a colon or a quote instead. */
    const end = source.indexOf("`}", start + 12);
    if (end === -1) return found;
    found.push(source.slice(start + 12, end));
    from = end + 2;
  }
};

describe("Tailwind class boundaries", () => {
  it("never glues a class to an interpolation in a className template", () => {
    const templates = walkFiles(APP_DIR)
      .filter((file) => file.endsWith(".tsx"))
      .flatMap((file) => classTemplates(readFileSync(file, "utf8")).map((template) => ({ file, template })));
    /* A walk that found nothing would pass this vacuously. */
    assert.ok(templates.length > 50, `expected the app's className templates, scanned ${templates.length}`);
    const offenders = templates
      .filter(({ template }) => GLUED.test(template))
      .map(({ file, template }) => `${relative(APP_DIR, file)}: ${template.slice(0, 90).replace(/\s+/g, " ")}`);
    assert.deepEqual(offenders, [], "put a space before `${` so the class before it is a token of its own");
  });

  it("catches the shape it guards against", () => {
    assert.equal(GLUED.test('max-md:py-3${row.moved ? " bg-amber" : ""}'), true);
    assert.equal(GLUED.test('max-md:py-3 ${row.moved ? "bg-amber" : ""}'), false);
    assert.equal(GLUED.test('${className}'), false);
  });
});
