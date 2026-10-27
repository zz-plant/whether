import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { sendOpsFailureNotice } from "../lib/delivery/opsNotice";
import type { EmailDeliveryAdapter } from "../lib/email/emailDelivery";

type Sent = Parameters<EmailDeliveryAdapter["send"]>[0];

const capture = (result: Awaited<ReturnType<EmailDeliveryAdapter["send"]>> = { ok: true }) => {
  const sent: Sent[] = [];
  const adapter: EmailDeliveryAdapter = {
    send: async (message) => {
      sent.push(message);
      return result;
    },
  };
  return { sent, adapter };
};

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_OPS_EMAIL");
});

describe("sendOpsFailureNotice", () => {
  it("sends nothing for a run where every step succeeded", async () => {
    Reflect.set(globalThis, "WHETHER_OPS_EMAIL", "owner@example.com");
    const { sent, adapter } = capture();
    assert.deepEqual(await sendOpsFailureNotice({ run: "Daily run", failures: [] }, adapter), { ok: true, sent: false });
    assert.equal(sent.length, 0);
  });

  it("reports a failed run with no address as a failure, not a skip", async () => {
    const { sent, adapter } = capture();
    const result = await sendOpsFailureNotice({ run: "Daily run", failures: [{ step: "summary-history", error: "kv down" }] }, adapter);
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.error, /WHETHER_OPS_EMAIL/);
    assert.equal(sent.length, 0);
  });

  it("sends one email naming each failed step by its operator label", async () => {
    Reflect.set(globalThis, "WHETHER_OPS_EMAIL", "owner@example.com");
    const { sent, adapter } = capture();
    const result = await sendOpsFailureNotice(
      {
        run: "Monday 14:00 UTC run, 2026-10-19",
        failures: [
          { step: "email/send-weekly", error: "refused_unpublishable: <stale>" },
          { step: "brand-new-step" },
        ],
      },
      adapter,
    );
    assert.deepEqual(result, { ok: true, sent: true });
    assert.equal(sent.length, 1);
    const [message] = sent;
    assert.equal(message.to.email, "owner@example.com");
    assert.equal(message.subject, "Whether: 2 scheduled steps failed");
    assert.match(message.text, /- Weekly email: refused_unpublishable: <stale>/);
    assert.match(message.text, /- brand-new-step: no reason recorded/);
    assert.match(message.html, /refused_unpublishable: &lt;stale&gt;/);
    assert.doesNotMatch(message.html, /<stale>/);
  });

  it("shortens a stack-length error", async () => {
    Reflect.set(globalThis, "WHETHER_OPS_EMAIL", "owner@example.com");
    const { sent, adapter } = capture();
    await sendOpsFailureNotice({ run: "Daily run", failures: [{ step: "summary-history", error: "x".repeat(2_000) }] }, adapter);
    assert.ok(sent[0].text.length < 1_000);
    assert.match(sent[0].text, /x…/);
  });

  it("returns the adapter's error rather than throwing", async () => {
    Reflect.set(globalThis, "WHETHER_OPS_EMAIL", "owner@example.com");
    const { adapter } = capture({ ok: false, error: "binding refused" });
    assert.deepEqual(
      await sendOpsFailureNotice({ run: "Daily run", failures: [{ step: "summary-history" }] }, adapter),
      { ok: false, error: "binding refused" },
    );
  });
});
