#!/usr/bin/env node
/**
 * Send the real emails to a real inbox, in one command.
 *
 *   bun run email:test -- you@example.com
 *
 * Starts a local worker with the live `send_email` binding, opens a public
 * tunnel so every link in the mail works from an inbox, then drives the emails
 * a subscriber actually receives:
 *
 *   1. the confirmation mail, and the link in it
 *   2. the month-end pulse (a fresh test store has no prior month, so it fires)
 *   3. the alert the day conditions change
 *   4. the Monday brief
 *
 * It runs against its own KV (`.wrangler/email-test`), so nothing here can mail
 * anyone but the address you name. The tunnel and the worker stay up so the
 * links in the mail keep working; press Ctrl-C to stop them.
 *
 * `send_email` only sends for real when the binding is `remote = true`, and
 * vinext's virtual modules break `wrangler dev --config <other file>`. So this
 * patches `wrangler.toml` for the length of the run and restores it from a
 * backup on every exit path — including a crash, on the next run.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";

const BASE = "http://localhost:8787";
const CONFIG = "wrangler.toml";
const BACKUP = "wrangler.toml.email-test-backup";
const PERSIST = ".wrangler/email-test";
const SECRET = "email-test-secret";
const DAILY_CRON = "0 2 * * *";

const address = (process.argv[2] ?? "").trim();
const noSend = process.argv.includes("--no-send");
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
  console.error("usage: bun run email:test -- you@example.com");
  process.exit(2);
}

/* A previous run that died before restoring would leave `remote = true` in the
   config, which a deploy would inherit. Put it back before doing anything else. */
if (existsSync(BACKUP)) {
  renameSync(BACKUP, CONFIG);
  console.log("[setup] restored wrangler.toml from an interrupted run");
}

const children = [];
let restored = false;

const restore = () => {
  if (restored) return;
  restored = true;
  for (const child of children) child.kill("SIGTERM");
  if (existsSync(BACKUP)) renameSync(BACKUP, CONFIG);
};

/* Every way out restores the config. `timeout` sends SIGTERM, and Node runs no
   `exit` hook for a signal it does not handle — that is how a `remote = true`
   survived a run on 2026-10-30 and sat in the working tree. */
const stop = (signal) => {
  console.log(`\n${signal}: stopping; the links in the mail stop working now`);
  restore();
  process.exit(0);
};
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGQUIT"]) process.on(signal, () => stop(signal));
process.on("exit", restore);
process.on("uncaughtException", (error) => {
  console.error(error);
  restore();
  process.exit(1);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (label, check, { timeoutMs = 90_000, everyMs = 500 } = {}) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch {
      // not ready yet
    }
    await sleep(everyMs);
  }
  throw new Error(`${label} did not come up within ${timeoutMs / 1000}s`);
};

const post = (path, body = {}, headers = {}) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const explorer = (query = "") =>
  fetch(`${BASE}/cdn-cgi/local/explorer/api/local/email/sending${query}`).then((response) => response.json());

const mailsTo = async (email) => {
  const list = (await explorer("?per_page=100")).result ?? [];
  const mine = list
    .filter((entry) => (entry.to ?? []).includes(email))
    .sort((left, right) => String(left.sentAt).localeCompare(String(right.sentAt)));
  const details = await Promise.all(
    mine.map((entry) => explorer(`?email_id=${encodeURIComponent(entry.messageId)}`).then((payload) => payload.result)),
  );
  return details.filter(Boolean);
};

const main = async () => {
  console.log(`\nemail test → ${address}\n`);

  console.log("1/4  starting a tunnel so the links work from an inbox");
  const tunnel = spawn("cloudflared", ["tunnel", "--url", BASE, "--no-autoupdate"], { stdio: ["ignore", "pipe", "pipe"] });
  children.push(tunnel);
  let tunnelLog = "";
  tunnel.stderr.on("data", (chunk) => {
    tunnelLog += String(chunk);
  });
  const url = await waitFor(
    "the tunnel URL",
    async () => tunnelLog.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0],
    { timeoutMs: 60_000 },
  );
  console.log(`     ${url}`);

  console.log("2/4  starting the worker with the live email binding");
  const original = readFileSync(CONFIG, "utf8");
  if (!original.includes('[[send_email]]\nname = "EMAIL"')) {
    throw new Error("wrangler.toml no longer has the EMAIL binding block this script patches");
  }
  writeFileSync(BACKUP, original);
  writeFileSync(CONFIG, original.replace('[[send_email]]\nname = "EMAIL"', '[[send_email]]\nname = "EMAIL"\nremote = true'));
  rmSync(PERSIST, { recursive: true, force: true });

  const worker = spawn(
    "bun",
    ["run", "serve:worker", "--", "--persist-to", PERSIST, "--var", `APP_BASE_URL:${url}`, "--var", `WHETHER_CRON_SECRET:${SECRET}`],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  children.push(worker);
  worker.stdout.on("data", () => {});
  worker.stderr.on("data", () => {});
  await waitFor("the worker", async () => (await fetch(`${BASE}/api/health`)).ok);
  console.log("     ready");

  if (noSend) {
    console.log("\nsetup ok: tunnel + worker + live email binding. Not sending (--no-send).");
    console.log("Press Ctrl-C to stop.\n");
    await new Promise(() => {});
  }

  console.log("3/4  subscribing, and confirming the address");
  const signup = await post("/api/email/subscribe", { email: address, weekly: true, alerts: true });
  if (!signup.ok) throw new Error(`subscribe answered ${signup.status}: ${await signup.text()}`);
  const confirmMail = await waitFor("the confirmation mail", async () => (await mailsTo(address)).find((mail) => /Confirm/.test(mail.subject)));
  const token = confirmMail.text.match(/\/api\/email\/verify\?token=([0-9a-f-]+)/)?.[1];
  if (!token) throw new Error("the confirmation mail carried no link");
  const confirm = await fetch(`${BASE}/api/email/verify`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }).toString(),
  });
  if (!confirm.ok) throw new Error(`confirm answered ${confirm.status}`);
  console.log(`     ${confirmMail.subject}`);

  console.log("4/4  sending the alert, then the brief");
  await fetch(`${BASE}/cdn-cgi/local/scheduled?cron=${encodeURIComponent(DAILY_CRON)}`, { method: "POST" });
  const alertMail = await waitFor("the alert mail", async () => (await mailsTo(address)).find((mail) => mail.subject.startsWith("Whether Alert")));
  console.log(`     ${alertMail.subject}`);

  const weekly = await post("/api/email/send-weekly", {}, { authorization: `Bearer ${SECRET}` }).then((response) => response.json());
  if (!weekly.ok) throw new Error(`send-weekly refused: ${weekly.error ?? JSON.stringify(weekly)}`);
  const briefMail = await waitFor("the brief", async () => (await mailsTo(address)).find((mail) => /^Whether (Brief )?—/.test(mail.subject) && !mail.subject.startsWith("Whether Alert")));
  console.log(`     ${briefMail.subject}`);

  const sent = await mailsTo(address);
  const kb = (mail) => `${Math.round(mail.html.length / 1024)} KB`;
  console.log(`\n${sent.length} emails sent to ${address}:\n`);
  for (const mail of sent) console.log(`  · ${mail.subject}  (${kb(mail)})`);

  const deadLinks = sent.flatMap((mail) => mail.text.match(/https?:\/\/\S+/g) ?? []).filter((link) => !link.startsWith(url) && !link.includes("whether.work"));
  if (deadLinks.length > 0) console.log(`\n  links outside the tunnel: ${[...new Set(deadLinks)].join(", ")}`);

  console.log(`\nLinks in these emails point at ${url}`);
  console.log("and keep working while this runs. Press Ctrl-C when you're done.\n");

  await new Promise(() => {});
};

main().catch((error) => {
  console.error(`\n[email:test] ${error instanceof Error ? error.message : String(error)}`);
  restore();
  process.exit(1);
});
