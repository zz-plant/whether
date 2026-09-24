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

  it("tracks only text set in capitals", () => {
    /* Tracking is spacing for caps (§XVIII). Sixty-odd sentence-case labels,
       buttons and summaries still carried 0.08–0.16em after the eyebrow lost
       its capitals, because each spelled the tracking out inline. The OG and
       email templates are other media and are not read here. */
    const tracked = /\btracking-\[0\.(?:0[6-9]|[1-9]\d?)em\]|\btracking-wider\b|\btracking-widest\b/;
    const offenders: string[] = [];
    const files = readdirSync("app", { recursive: true, encoding: "utf8" }).filter(
      (file) => /\.tsx?$/.test(file) && !file.startsWith("api/og/") && file !== "layout.tsx",
    );
    for (const file of files) {
      readFileSync(`app/${file}`, "utf8").split("\n").forEach((line, index) => {
        if (tracked.test(line) && !/\buppercase\b/.test(line)) offenders.push(`app/${file}:${index + 1}`);
      });
    }
    assert.deepEqual(offenders, []);

    const stylesheets = readdirSync("app/styles").filter((file) => file.endsWith(".css"));
    const cssOffenders: string[] = [];
    for (const file of stylesheets) {
      for (const rule of readFileSync(`app/styles/${file}`, "utf8").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const spacing = /letter-spacing:\s*0?\.(\d+)em/.exec(rule[2]);
        if (spacing && Number(`0.${spacing[1]}`) >= 0.06 && !/uppercase/.test(rule[2]) && !/type-badge|kbd/.test(rule[1])) {
          cssOffenders.push(`${file}: ${rule[1].trim().split("\n").pop()}`);
        }
      }
    }
    assert.deepEqual(cssOffenders, []);
  });

  it("does not stamp a link as a badge", () => {
    const source = readFileSync("app/components/ui/actionLink.tsx", "utf8");
    assert.doesNotMatch(source, /type-badge|\buppercase\b/, "ActionLink's inline variant rendered every inline link in capitals");
  });
});
