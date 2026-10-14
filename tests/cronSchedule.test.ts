import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { z } from "zod";

/*
 * Cloudflare counts weekdays from 1 = Sunday, where most cron dialects count 1 = Monday. The
 * weekly send was written "0 14 * * 1" and went out on Sundays from May to October 2026, and
 * every step reported green, because nothing about a step knows which day it was meant to be.
 * A weekday name means the same day in every dialect, so a number is refused outright.
 */
const wrangler = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
const cronsLine = /^crons\s*=\s*(\[.*\])\s*$/m.exec(wrangler)?.[1];
const crons = z.array(z.string()).parse(JSON.parse(cronsLine ?? "null"));

describe("wrangler.toml cron triggers", () => {
  it("names every weekday rather than numbering it", () => {
    for (const cron of crons) {
      const fields = cron.trim().split(/\s+/);
      assert.equal(fields.length, 5, `${cron} should have five fields`);
      const weekday = fields[4];
      assert.doesNotMatch(weekday, /\d/, `${cron}: write the weekday as a name (MON), not a number`);
    }
  });

  it("keeps the daily ingest the scheduled handler tells apart from the weekly send", () => {
    /* worker/index.ts treats exactly this string as the daily run and every other as Monday's. */
    assert.ok(crons.includes("0 2 * * *"));
    assert.ok(crons.includes("0 14 * * MON"));
    assert.equal(crons.length, 2);
  });
});
