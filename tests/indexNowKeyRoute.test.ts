import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { GET } from "../app/indexnow/[key]/route";

const originalKey = process.env.INDEXNOW_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.INDEXNOW_KEY;
  else process.env.INDEXNOW_KEY = originalKey;
});

const request = (key: string) =>
  GET(new Request(`https://whether.work/indexnow/${key}.txt`), { params: Promise.resolve({ key: `${key}.txt` }) });

describe("IndexNow key file", () => {
  it("serves the key when the requested file matches it", async () => {
    process.env.INDEXNOW_KEY = "abc123";
    const response = await request("abc123");
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "abc123");
  });

  it("404s for a different key and when no key is configured", async () => {
    process.env.INDEXNOW_KEY = "abc123";
    assert.equal((await request("other")).status, 404);

    delete process.env.INDEXNOW_KEY;
    assert.equal((await request("abc123")).status, 404);
  });
});
