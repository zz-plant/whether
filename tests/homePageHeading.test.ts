import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("homepage heading contract", () => {
  it("keeps the home route responsible for the page-level Weekly Brief h1", () => {
    const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

    assert.match(source, /<h1 className="sr-only">Weekly Brief<\/h1>/);
  });
});
