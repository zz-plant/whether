import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";

import { CLIENT_TOKEN_HEADER, issueClientToken, verifyClientToken } from "../lib/api/clientToken";
import { requireClientOwner } from "../lib/api/clientOwnership";
import { CLIENT_ID_HEADER } from "../lib/api/clientIdHeader";

const SECRET = "test-ledger-secret-0123456789";

const withSecret = (value: string | undefined) => {
  if (value === undefined) delete process.env.WHETHER_LEDGER_SECRET;
  else process.env.WHETHER_LEDGER_SECRET = value;
};

afterEach(() => withSecret(undefined));

const request = (headers: Record<string, string>) =>
  new Request("https://whether.work/api/decision-memory", { method: "POST", headers });

/**
 * The ledger's write path had no authentication, and the ledger is the artifact
 * that would evidence the human review the Acceptable Use Policy requires for
 * decisions affecting individuals. Anyone could append a record naming a human
 * who never looked at anything.
 *
 * These pin the two halves of the fix: an id the server signed means something,
 * and an id it did not sign means nothing — but is still accepted, because
 * refusing the write would break every existing caller and the safe outcome is
 * an honest record rather than no record.
 */
describe("ledger client tokens", () => {
  it("verifies a token it issued", async () => {
    withSecret(SECRET);
    const token = await issueClientToken("browser-1");

    assert.ok(token, "no token issued with a secret configured");
    assert.equal(await verifyClientToken("browser-1", token), true);
  });

  it("refuses a token issued for a different id", async () => {
    withSecret(SECRET);
    const token = await issueClientToken("browser-1");

    assert.equal(await verifyClientToken("browser-2", token), false);
  });

  it("cannot be satisfied without the secret", async () => {
    withSecret(SECRET);
    const token = await issueClientToken("browser-1");

    /* A deployment that cannot sign cannot verify either — the same token stops
       meaning anything, rather than being taken on trust. */
    withSecret(undefined);
    assert.equal(await verifyClientToken("browser-1", token), false);
    assert.equal(await issueClientToken("browser-1"), null);
  });

  it("refuses a secret too short to be one", async () => {
    withSecret("short");
    assert.equal(await issueClientToken("browser-1"), null);
  });

  it("admits an unsigned caller but does not vouch for it", async () => {
    withSecret(SECRET);
    const owner = await requireClientOwner(request({ [CLIENT_ID_HEADER]: "browser-1" }), "browser-1");

    assert.equal(owner.error, null);
    assert.equal(owner.ownerId, "browser-1");
    assert.equal(owner.verified, false);
  });

  it("vouches for a signed caller", async () => {
    withSecret(SECRET);
    const token = await issueClientToken("browser-1");
    const owner = await requireClientOwner(
      request({ [CLIENT_ID_HEADER]: "browser-1", [CLIENT_TOKEN_HEADER]: token ?? "" }),
      "browser-1",
    );

    assert.equal(owner.verified, true);
  });

  it("does not vouch for a caller presenting someone else's token", async () => {
    withSecret(SECRET);
    const token = await issueClientToken("browser-1");
    const owner = await requireClientOwner(
      request({ [CLIENT_ID_HEADER]: "browser-2", [CLIENT_TOKEN_HEADER]: token ?? "" }),
      "browser-2",
    );

    /* The id is well-formed and self-consistent, which is all the old check
       asked. The signature is what makes it someone's. */
    assert.equal(owner.error, null);
    assert.equal(owner.verified, false);
  });
});
