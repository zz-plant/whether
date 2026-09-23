import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

/*
 * The type register (ui-ux-standards §XVIII, DD-028). These are source reads
 * on purpose: the claim is about a stylesheet rule and the classes call sites
 * carry, and no render in this suite applies CSS.
 */
const typography = readFileSync("app/styles/typography.css", "utf8");
const ruleBody = (selector: string) => {
  const match = new RegExp(`\\n${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(typography);
  assert.ok(match, `${selector} is defined`);
  return match[1];
};

describe("type register", () => {
  it("sets labels in sentence case, without caps tracking", () => {
    const eyebrow = ruleBody(".type-eyebrow");
    assert.doesNotMatch(eyebrow, /uppercase/, ".type-eyebrow went back to capitals");
    const tracking = /letter-spacing:\s*([\d.]+)em/.exec(eyebrow);
    assert.ok(!tracking || Number(tracking[1]) <= 0.02, "caps tracking on a sentence-case label reads as a typo");
  });

  it("keeps capitals on the badge, which is a stamp", () => {
    assert.match(ruleBody(".type-badge"), /uppercase/);
  });

  it("does not capitalise or track an inline link", () => {
    /* Anything clickable reads as a sentence; a capitalised link is a label
       pretending to be one. */
    const offenders: string[] = [];
    const files = readdirSync("app", { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".tsx"));
    for (const file of files) {
      const source = readFileSync(`app/${file}`, "utf8");
      for (const tag of source.matchAll(/<(?:Link|a)\b[^>]*className="([^"]*)"/g)) {
        if (/\buppercase\b|tracking-\[0\.(?:0[6-9]|1\d|2\d)em\]|tracking-wider|tracking-widest/.test(tag[1])) {
          offenders.push(`${file}: ${tag[1]}`);
        }
      }
    }
    assert.deepEqual(offenders, []);
  });
});
