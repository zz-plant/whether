import assert from "node:assert/strict";
import { createHmac, createHash } from "node:crypto";
import { describe, it, mock, spyOn } from "bun:test";
import { constantTimeCompare } from "../lib/constantTimeCompare";
import { hmacSha256, sha256Hex, toHex } from "../lib/crypto";

describe("constantTimeCompare", () => {
  it("answers equality, including for different lengths and empty strings", () => {
    assert.equal(constantTimeCompare("secret-value", "secret-value"), true);
    assert.equal(constantTimeCompare("secret-valuX", "secret-value"), false);
    assert.equal(constantTimeCompare("secret", "secret-value"), false);
    assert.equal(constantTimeCompare("secret-value-and-more", "secret-value"), false);
    assert.equal(constantTimeCompare("", "secret-value"), false);
    assert.equal(constantTimeCompare("secret-value", ""), false);
    assert.equal(constantTimeCompare("", ""), true);
  });

  it("does not take a prefix of the secret, or the secret repeated, for the secret", () => {
    assert.equal(constantTimeCompare("abcabc", "abc"), false);
    assert.equal(constantTimeCompare("ab", "abc"), false);
  });

  /* It used to return the moment the lengths differed, so a cron route answered a guess of the
     wrong length measurably faster than one of the right length. The work is now one pass over
     the supplied value, whatever the secret's length; counted rather than timed, because a
     timing assertion in a shared suite is a flaky one. */
  it("does the same work for a guess whatever the secret's length", () => {
    const guess = "g".repeat(32);
    const secrets = ["s", "s".repeat(32), "s".repeat(500)];
    // A prototype spy is process-wide, so it is restored before anything else can run.
    const reads = spyOn(String.prototype, "charCodeAt");
    const counts: number[] = [];
    try {
      for (const secret of secrets) {
        const before = reads.mock.calls.length;
        constantTimeCompare(guess, secret);
        counts.push(reads.mock.calls.length - before);
      }
    } finally {
      mock.restore();
    }

    assert.deepEqual(counts, [64, 64, 64]);
  });
});

describe("lib/crypto", () => {
  it("matches node's HMAC-SHA256 and SHA-256", async () => {
    const expected = createHmac("sha256", "key").update("message").digest("hex");
    assert.equal(toHex(await hmacSha256("key", "message")), expected);
    assert.equal(await sha256Hex("text"), createHash("sha256").update("text").digest("hex"));
  });

  it("hex-encodes an ArrayBuffer and a Uint8Array alike", () => {
    const bytes = new Uint8Array([0, 15, 16, 255]);
    assert.equal(toHex(bytes), "000f10ff");
    assert.equal(toHex(bytes.buffer), "000f10ff");
  });
});
