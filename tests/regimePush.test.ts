import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { buildVapidAuthorization, resolveVapidConfig } from "../lib/push/vapid";
import { parsePushSubscription } from "../lib/push/pushSubscriptions";
import { sendRegimeChangePush } from "../lib/push/sendRegimePush";

/**
 * Browser notifications for a regime change.
 *
 * Two things here could be wrong in ways nobody would notice until it mattered:
 * a VAPID assertion that does not verify (the push service just refuses, and
 * the only symptom is that nobody is ever notified), and an intake that accepts
 * a subscription it should not. Both are exercised against real crypto rather
 * than against a fixture of what the crypto is expected to produce.
 */

/* A real P-256 pair, generated per run, encoded exactly as an operator would
   set the two variables. Generating rather than pinning is the point: it proves
   the encoding round-trips, which a hardcoded pair would assume. */
const generateVapidEnv = async () => {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);

  const base64Url = (bytes: Uint8Array) => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  return {
    env: {
      VAPID_PUBLIC_KEY: base64Url(raw),
      VAPID_PRIVATE_KEY: jwk.d ?? "",
      VAPID_SUBJECT: "mailto:ops@whether.work",
    },
    publicKey: pair.publicKey,
  };
};

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
});

describe("regime change push", () => {
  it("is unconfigured until an operator sets all three values", () => {
    assert.equal(resolveVapidConfig({}), null);
    assert.equal(resolveVapidConfig({ VAPID_PUBLIC_KEY: "a", VAPID_PRIVATE_KEY: "b" }), null);
    assert.equal(resolveVapidConfig({ VAPID_PUBLIC_KEY: " ", VAPID_PRIVATE_KEY: "b", VAPID_SUBJECT: "c" }), null);
  });

  /*
   * The assertion the push service checks. If this does not verify the service
   * simply refuses, and the only symptom is that nobody is ever notified — so
   * it is verified here against the public half of the same pair.
   */
  it("signs an assertion the matching public key verifies", async () => {
    const { env, publicKey } = await generateVapidEnv();
    const config = resolveVapidConfig(env);
    assert.ok(config);

    const header = await buildVapidAuthorization(config, "https://fcm.googleapis.com/fcm/send/abc");
    const token = /^vapid t=([^,]+), k=(.+)$/.exec(header);
    assert.ok(token, `unexpected header shape: ${header}`);

    const [headerSegment, payloadSegment, signatureSegment] = token[1].split(".");
    const decode = (segment: string) =>
      Uint8Array.from(atob(segment.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(segment.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

    const verified = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      decode(signatureSegment),
      new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
    );
    assert.equal(verified, true, "the push service would refuse this and nobody would ever be notified");

    const claims = JSON.parse(new TextDecoder().decode(decode(payloadSegment)));
    /* A token minted for one push service must not be replayable at another. */
    assert.equal(claims.aud, "https://fcm.googleapis.com");
    assert.equal(claims.sub, "mailto:ops@whether.work");
    assert.ok(claims.exp > Math.floor(Date.now() / 1000));
    assert.equal(token[2], env.VAPID_PUBLIC_KEY, "the service matches k= against the signature");
  });

  it("refuses a subscription it would later make a request to over anything but https", () => {
    const keys = { p256dh: "key", auth: "auth" };
    assert.equal(parsePushSubscription({ endpoint: "http://example.com/push", keys }, "browser"), null);
    assert.equal(parsePushSubscription({ endpoint: "file:///etc/passwd", keys }, "browser"), null);
    assert.equal(parsePushSubscription({ endpoint: "not a url", keys }, "browser"), null);
    assert.equal(parsePushSubscription({ endpoint: "https://push.example/1" }, "browser"), null);
    assert.equal(parsePushSubscription({ endpoint: "https://push.example/1", keys: { p256dh: "", auth: "a" } }, "browser"), null);

    const valid = parsePushSubscription({ endpoint: "https://push.example/1", keys }, "browser");
    assert.deepEqual(valid, { clientId: "browser", endpoint: "https://push.example/1", p256dh: "key", auth: "auth" });
  });

  /*
   * "Not configured" must never read as "nobody subscribed". One is an operator
   * action still outstanding; the other is a fact about readers, and a run that
   * reported the second for the first would close the question.
   */
  it("names a missing configuration rather than reporting nothing to send", async () => {
    const result = await sendRegimeChangePush({ env: {} });
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /VAPID/);
    assert.equal(result.sent, 0);
  });

  /* The push carries no body, which is why it cannot deliver a stale reading —
     the notification's text is fetched when it is drawn. */
  it("sends no payload", async () => {
    const sender = await readFile("lib/push/sendRegimePush.ts", "utf8");
    assert.doesNotMatch(sender, /body:/, "a payload would need RFC 8291 encryption and could arrive stale");
    assert.match(sender, /"Content-Length": "0"/);

    const worker = await readFile("public/sw.js", "utf8");
    assert.match(worker, /fetch\("\/api\/posture\/current"/, "the notification's text is read when it is shown");
    assert.match(worker, /showNotification/);
  });

  /* A notification that fires whether or not anything happened is one people
     turn off, and then the one that mattered never arrives. */
  it("fires only where the published regime actually moved", async () => {
    const check = await readFile("lib/alert/checkRegimeChange.ts", "utf8");
    const guarded = /if \(previousRegime && previousRegime !== currentRegime\) \{([\s\S]*?)\n  \}/.exec(check)?.[1] ?? "";
    assert.match(guarded, /sendRegimeChangePush\(\)/, "the only call site is the branch that knows the regime changed");
    assert.equal(check.match(/sendRegimeChangePush\(\)/g)?.length, 1);
    /* A slow push service must not fail the regime check, which has KV state to
       write after this. */
    assert.match(check, /sendRegimeChangePush\(\)\.catch\(/);
  });

  it("offers nothing where push is not configured", async () => {
    const toggle = await readFile("app/components/regimeAlertToggle.tsx", "utf8");
    assert.match(toggle, /if \(!supported \|\| state\.status === "unavailable"/);
    assert.match(toggle, /Notification\.requestPermission/);
    /* A permission prompt on load is how a site gets its notifications blocked
       permanently, and a blocked browser is one this control cannot recover. */
    const promptIndex = toggle.indexOf("Notification.requestPermission");
    const subscribeIndex = toggle.indexOf("const subscribe = useCallback");
    assert.ok(subscribeIndex >= 0 && promptIndex > subscribeIndex, "permission is asked for inside the subscribe action, not on mount");
  });
});
