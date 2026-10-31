import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { readFileSync } from "node:fs";

import { planLineEmail } from "../lib/alert/alertTemplates";
import { runMonthEndPulse } from "../lib/alert/monthEndPulse";
import { escapeHtml, unsubscribeHeaders } from "../lib/email/emailShell";
import { sendWeeklyBrief } from "../lib/email/sendWeeklyBrief";
import { resolveEmailBaseUrl } from "../lib/email/publicBaseUrl";
import { getSubscriberStore, resetSubscriberStore } from "../lib/email/subscriberStore";
import { liveMacroSeries } from "./fixtures/reportFixtures";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import type { KvNamespace } from "../lib/runtime/kv";
import { siteUrl } from "../lib/siteUrl";
import { snapshotData } from "../lib/snapshot";

/*
 * One email shell, resolved through `lib/siteUrl`.
 *
 * There were three: `baseHtml` in the alert templates, a copy of it inline in
 * the weekly brief, and the month-end pulse's own, which had no footer and no
 * unsubscribe link in its HTML part. The copy is why the 2026-09-17 fix that
 * moved the weekly email onto `siteUrl` missed the alerts: their shell, their
 * unsubscribe URL and their text bodies kept the production origin.
 *
 * On production the configured origin and the old literal are the same string,
 * so no rendered assertion can tell them apart — the lane where they differ is
 * the one this suite never runs in. The first two cases pin that production
 * output did not move; the third is a source read, and says so.
 */

const PRODUCTION_ORIGIN = "https://whether.work";

class FakeKv implements KvNamespace {
  private readonly entries = new Map<string, string>();

  async get(key: string) {
    return this.entries.get(key) ?? null;
  }

  async put(key: string, value: string) {
    this.entries.set(key, value);
  }

  async delete(key: string) {
    this.entries.delete(key);
  }

  async list(options?: { prefix?: string }) {
    const prefix = options?.prefix ?? "";
    return {
      keys: [...this.entries.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    };
  }
}

/** Installs an EMAIL binding that keeps what it was handed; the stub drops the bodies. */
const captureMail = () => {
  const sent: Array<{ subject: string; html: string; text: string; headers?: Record<string, string> }> = [];
  const previous = Reflect.get(globalThis, "EMAIL");
  Reflect.set(globalThis, "EMAIL", {
    send: async (message: { subject: string; html: string; text: string; headers?: Record<string, string> }) => {
      sent.push(message);
    },
  });
  const restore = () => {
    if (previous === undefined) Reflect.deleteProperty(globalThis, "EMAIL");
    else Reflect.set(globalThis, "EMAIL", previous);
  };
  return { sent, restore };
};

/* The shell's closing lines exactly as production mailed them before the shell
   was shared, with the unsubscribe token as `TOKEN`, in the colours of the
   Synoptic palette (2026-10-09, lib/image/ogTheme.ts). */
const PRODUCTION_SHELL_FOOTER = [
  `<div style="margin-top:24px;">`,
  `<a href="https://whether.work" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#edf0ee;color:#0f1316;text-decoration:none;font-weight:600;font-size:0.9rem;">View full brief →</a>`,
  `</div>`,
  `<p style="margin-top:32px;font-size:0.75rem;color:#a0a9a7;">Based on public data. Your situation may vary.</p>`,
  `<hr style="border:none;border-top:1px solid #393e41;margin-top:24px;" />`,
  `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr>`,
  `<td style="font-size:0.7rem;color:#a0a9a7;padding-top:12px;">`,
  `<a href="https://whether.work/trust" style="color:#a0a9a7;text-decoration:underline;">Methodology</a>`,
  ` · `,
  `<a href="https://whether.work/share" style="color:#a0a9a7;text-decoration:underline;">Share</a>`,
  ` · `,
  `<a href="https://whether.work" style="color:#a0a9a7;text-decoration:underline;">whether.work</a>`,
  ` · <a href="https://whether.work/api/email/unsubscribe?token=TOKEN" style="color:#a0a9a7;text-decoration:underline;">Unsubscribe</a>`,
  `</td></tr></table>`,
  `</body></html>`,
];

const PRODUCTION_SHELL_HEAD = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0f1316;color:#cdd3d1;">`;

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  resetSubscriberStore();
});

describe("the shared email shell, on production", () => {
  it("mails an alert byte for byte as it was mailed before", () => {
    assert.equal(siteUrl, PRODUCTION_ORIGIN, "precondition: this pin is about the production origin");

    const { subject, html, text } = planLineEmail({ headline: "PH", body: "PB" }, "tok");

    assert.equal(subject, "Whether Alert — PH");
    assert.equal(
      html,
      [
        PRODUCTION_SHELL_HEAD,
        `<h1 style="font-size:1.25rem;font-weight:600;margin:0 0 4px;color:#edf0ee;">Whether Plan Alert</h1>`,
        `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:12px;">`,
        `<tr>`,
        `<td style="padding:12px 16px;border:1px solid #393e41;border-radius:8px;background:#2d1a1e;">`,
        `<p style="font-size:0.85rem;color:#f2685c;margin:0;"><strong>PH</strong></p>`,
        `</td></tr></table>`,
        `<div style="margin-top:12px;">`,
        `<table role="presentation" style="width:100%;border-collapse:collapse;">`,
        `<tr>`,
        `<td style="padding:16px;border:1px solid #393e41;border-radius:8px;background:#171c20;">`,
        `<p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#a0a9a7;margin:0 0 6px;">What you set and where the scores are</p>`,
        `<p style="font-size:1.1rem;font-weight:600;margin:0;color:#edf0ee;">PB</p>`,
        `</td></tr></table>`,
        `</div>`,
        ...PRODUCTION_SHELL_FOOTER.map((line) => line.replace("TOKEN", "tok")),
      ].join("\n"),
    );
    assert.equal(
      text,
      [
        "Whether Plan Alert",
        "PH",
        "PB",
        "",
        "Your lines: https://whether.work/operate#ops-plan-lines",
        "---",
        "Whether · weekly operating brief",
        "Unsubscribe: https://whether.work/api/email/unsubscribe?token=tok",
      ].join("\n"),
    );
  });

  it("frames the weekly brief in the same shell it was mailed in before", async () => {
    resetSubscriberStore();
    const store = getSubscriberStore();
    const subscriber = await store.subscribe("operator@example.com");
    await store.verifyEmail(subscriber.confirmToken ?? "");

    const now = new Date("2026-08-31T12:00:00.000Z");
    const snapshot = buildOperatingSnapshot({
      treasury: { ...snapshotData, isLive: true, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
      macroSeries: liveMacroSeries,
      now,
    });

    const mail = captureMail();
    try {
      await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now });
    } finally {
      mail.restore();
    }

    const [message] = mail.sent;
    assert.ok(message, "the subscriber was mailed");
    const lines = message.html.split("\n");
    assert.equal(lines[0], PRODUCTION_SHELL_HEAD);
    assert.equal(lines[1], `<h1 style="font-size:1.25rem;font-weight:600;margin:0 0 4px;color:#edf0ee;">Whether Weekly Brief</h1>`);
    assert.deepEqual(
      lines.slice(-PRODUCTION_SHELL_FOOTER.length),
      PRODUCTION_SHELL_FOOTER.map((line) => line.replace("TOKEN", encodeURIComponent(subscriber.token))),
    );
    assert.match(message.text, /\n---\nWhether · weekly operating brief\nUnsubscribe: https:\/\/whether\.work\/api\/email\/unsubscribe\?token=\S+$/);

    /* Gmail clips a message over 102 KB, and a clipped brief ends in a "View
       entire message" link instead of the footer. The rendered brief is the one
       thing that leaves the building weekly, so the ceiling is a test. */
    assert.ok(message.html.length < 100_000, `the brief's HTML is ${message.html.length} bytes; Gmail clips past 102 KB`);
  });

  /* A source read, because on production the two are the same string. */
  it("writes no origin of its own in any sender", () => {
    for (const file of [
      "lib/email/emailShell.ts",
      "lib/email/sendWeeklyBrief.ts",
      "lib/alert/alertTemplates.ts",
      "lib/alert/monthEndPulse.ts",
      "lib/email/publicBaseUrl.ts",
    ]) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      assert.doesNotMatch(source, /https:\/\/whether\.work/, `${file} resolves its links through lib/siteUrl`);
    }
  });
});

describe("the shared email shell, on a deployment that is not production", () => {
  const previewOrigin = "https://abc123-whether.example.workers.dev";

  it("points every link at the host the send came from", () => {
    const { html, text } = planLineEmail({ headline: "PH", body: "PB" }, "tok", previewOrigin);

    assert.match(html, new RegExp(`href="${previewOrigin.replace(/\./g, "\\.")}"`), "the brief button carries the send's origin");
    assert.match(html, /abc123-whether\.example\.workers\.dev\/api\/email\/unsubscribe\?token=tok/, "the footer link reaches the deployment that sent it");
    assert.doesNotMatch(html, /https:\/\/whether\.work/, "no link in the mail points at production");
    assert.match(text, /Unsubscribe: https:\/\/abc123-whether\.example\.workers\.dev\/api\/email\/unsubscribe\?token=tok/);
  });

  it("carries the send's host through the weekly brief", async () => {
    resetSubscriberStore();
    const store = getSubscriberStore();
    const subscriber = await store.subscribe("preview@example.com");
    await store.verifyEmail(subscriber.confirmToken ?? "");

    const now = new Date("2026-08-31T12:00:00.000Z");
    const snapshot = buildOperatingSnapshot({
      treasury: { ...snapshotData, isLive: true, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
      macroSeries: liveMacroSeries,
      now,
    });

    const mail = captureMail();
    try {
      await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now, baseUrl: previewOrigin });
    } finally {
      mail.restore();
    }

    const [message] = mail.sent;
    assert.ok(message);
    assert.match(message.html, /abc123-whether\.example\.workers\.dev\/api\/email\/unsubscribe\?token=/, "the footer link reaches the deployment that sent it");
    assert.match(message.text, /https:\/\/abc123-whether\.example\.workers\.dev\/operate#ops-plan-lines/, "the plan-lines link stays on the deployment");
    assert.doesNotMatch(message.text, /https:\/\/whether\.work/, "no link in the brief points at production");
  });

  it("takes the origin from a trusted request host and ignores a forged one", () => {
    const configured = [process.env.APP_BASE_URL, process.env.NEXT_PUBLIC_APP_URL];
    delete process.env.APP_BASE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    try {
      assert.equal(resolveEmailBaseUrl(new Request("http://localhost:8787/api/email/send-weekly")), "http://localhost:8787");
      assert.equal(resolveEmailBaseUrl(new Request(`${previewOrigin}/api/email/send-weekly`)), previewOrigin);
      assert.equal(resolveEmailBaseUrl(new Request("https://evil.example/api/email/send-weekly")), siteUrl, "a forged Host header cannot choose the link target");
      assert.equal(resolveEmailBaseUrl(), siteUrl, "a cron send has no request and keeps the production origin");
    } finally {
      if (configured[0] !== undefined) process.env.APP_BASE_URL = configured[0];
      if (configured[1] !== undefined) process.env.NEXT_PUBLIC_APP_URL = configured[1];
    }
  });
});

describe("what a mail client can act on", () => {
  it("advertises the one-click unsubscribe the endpoint already accepts", () => {
    const headers = unsubscribeHeaders("tok", "https://example.workers.dev");
    assert.deepEqual(headers, {
      "List-Unsubscribe": "<https://example.workers.dev/api/email/unsubscribe?token=tok>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    assert.deepEqual(unsubscribeHeaders(null), {}, "no token, no header rather than a broken one");
  });

  it("sends the header on the weekly brief", async () => {
    resetSubscriberStore();
    const store = getSubscriberStore();
    const subscriber = await store.subscribe("headers@example.com");
    await store.verifyEmail(subscriber.confirmToken ?? "");

    const now = new Date("2026-08-31T12:00:00.000Z");
    const snapshot = buildOperatingSnapshot({
      treasury: { ...snapshotData, isLive: true, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
      macroSeries: liveMacroSeries,
      now,
    });

    const mail = captureMail();
    try {
      await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now });
    } finally {
      mail.restore();
    }

    const [message] = mail.sent;
    assert.ok(message?.headers?.["List-Unsubscribe"]?.includes(`token=${encodeURIComponent(subscriber.token)}`));
    assert.equal(message?.headers?.["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  });
});

describe("the brief a reader actually gets", () => {
  const snapshotFor = () => buildOperatingSnapshot({
    treasury: { ...snapshotData, isLive: true, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
    macroSeries: liveMacroSeries,
    now: new Date("2026-08-31T12:00:00.000Z"),
  });

  it("prints the reader's own lines first when they set any", async () => {
    resetSubscriberStore();
    const store = getSubscriberStore();
    const subscriber = await store.subscribe("own-lines@example.com", {
      planLines: [{
        area: "hiring",
        pause: [{ metric: "tightness", operator: ">", value: 76 }],
        resume: [{ metric: "tightness", operator: "<", value: 66 }],
      }],
      runwayBand: "balanced",
      /* A plan-lines-only signup asks for the crossing email and no Monday one;
         this test is about the Monday brief. */
      weekly: true,
    });
    await store.verifyEmail(subscriber.confirmToken ?? "");

    const snapshot = snapshotFor();
    const mail = captureMail();
    try {
      await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: new Date("2026-08-31T12:00:00.000Z") });
    } finally {
      mail.restore();
    }

    const [message] = mail.sent;
    assert.ok(message);
    assert.match(message.text, /\nYour lines: hiring (on hold|running|between its lines)\./);
    assert.ok(message.text.indexOf("Your lines:") < message.text.indexOf("Guidance:"), "their lines lead the published ones");
  });

  it("prints the cash-first note for a reader under six months, without plan lines", async () => {
    const sendTo = async (email: string, runwayBand?: "critical" | "balanced") => {
      resetSubscriberStore();
      const store = getSubscriberStore();
      const subscriber = await store.subscribe(email, runwayBand ? { runwayBand } : undefined);
      await store.verifyEmail(subscriber.confirmToken ?? "");
      const snapshot = snapshotFor();
      const mail = captureMail();
      try {
        await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: new Date("2026-08-31T12:00:00.000Z") });
      } finally {
        mail.restore();
      }
      return mail.sent[0]?.text ?? "";
    };

    const generic = await sendTo("no-band@example.com");
    const cashFirst = await sendTo("six-months@example.com", "critical");
    assert.ok(generic.length > 0 && cashFirst.length > 0);
    assert.notEqual(cashFirst, generic, "a reader under six months gets a different brief");
  });

  it("scales the rules to the stage the reader set", async () => {
    const sendTo = async (email: string, stage?: "seed" | "series-b") => {
      resetSubscriberStore();
      const store = getSubscriberStore();
      const subscriber = await store.subscribe(email, stage ? { stage } : undefined);
      await store.verifyEmail(subscriber.confirmToken ?? "");
      const snapshot = snapshotFor();
      const mail = captureMail();
      try {
        await sendWeeklyBrief({ snapshot, weeklyCall: snapshot.weeklyCall, now: new Date("2026-08-31T12:00:00.000Z") });
      } finally {
        mail.restore();
      }
      return mail.sent[0]?.text ?? "";
    };

    const unscaled = await sendTo("no-stage@example.com");
    const seed = await sendTo("seed@example.com", "seed");
    assert.ok(unscaled.length > 0 && seed.length > 0);
    assert.notEqual(seed, unscaled, "a reader who set a stage gets rules scaled to it");
  });
});

describe("the month-end pulse email", () => {
  it("is sent in the shared shell, with the unsubscribe link its HTML never carried", async () => {
    Object.assign(globalThis, { WHETHER_DURABLE_KV: new FakeKv() });
    resetSubscriberStore();
    const store = getSubscriberStore();
    const subscriber = await store.subscribe("investor-letter@example.com", { alerts: true });
    await store.verifyEmail(subscriber.confirmToken ?? "");

    /* Far above the last bundled month-end's rates, so the month reads as changed. */
    const snapshot = buildOperatingSnapshot({
      treasury: {
        source: "US Treasury",
        record_date: "2099-12-31",
        fetched_at: "2099-12-31T09:00:00Z",
        isLive: true,
        yields: { oneMonth: 9.5, threeMonth: 9.4, twoYear: 8.9, tenYear: 7.2 },
      },
      macroSeries: [],
      now: new Date("2099-12-31T13:00:00.000Z"),
    });

    const mail = captureMail();
    let result;
    try {
      result = await runMonthEndPulse({ snapshot, weeklyCall: snapshot.weeklyCall });
    } finally {
      mail.restore();
    }

    assert.equal(result.changed, true, "precondition: a quiet month sends nothing");
    assert.equal(result.sentEmail, 1);
    const [message] = mail.sent;
    assert.ok(message);

    assert.ok(message.html.startsWith(PRODUCTION_SHELL_HEAD));
    assert.match(message.html, /\/api\/email\/unsubscribe\?token=/);

    /* The block is a reader's paste, so everything in it is escaped — this
       escaped `<` alone — and nothing is lost doing it. */
    const block = message.text.split("\n\nUnsubscribe:")[0] ?? "";
    assert.match(block, /'/, "precondition: the block carries a character only the full escape covers");
    assert.ok(message.html.includes(escapeHtml(block).replace(/\n/g, "<br/>")));
  });
});

describe("escapeHtml", () => {
  it("escapes everything that can end a text node or a quoted attribute", () => {
    assert.equal(escapeHtml(`<a href="x">Tom & Jerry's</a>`), "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;");
  });
});
