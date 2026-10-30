#!/usr/bin/env node
/**
 * End-to-end email flows, against a locally running worker.
 *
 * Every use case the product has for email, driven the way a browser and the cron
 * drive it: subscribe → the confirmation mail → the link → the standing record →
 * the alert → the Monday brief → one-click unsubscribe. Nothing here reaches into
 * a module; it speaks HTTP to the worker and reads the mail the worker actually
 * sent, so a broken route, a stale token or a wrong promise fails here.
 *
 * The mail is captured by Miniflare's Local Explorer (`/cdn-cgi/local/explorer`),
 * which stores everything a `send_email` binding sends during a dev session. No
 * real address is mailed and no product code is changed for the test.
 *
 * The reading is primed through the same scheduled handler the cron uses, so the
 * alert is judged by the real transition logic rather than a fixture.
 *
 * Start the worker with the cron secret this script expects, then run it:
 *
 *   bun run serve:worker -- --var WHETHER_CRON_SECRET:e2e-secret
 *   bun run e2e:email
 *
 * Options: --base-url <url> (default http://localhost:8787), --secret <value>.
 * Exit codes: 0 all pass · 1 findings · 2 setup.
 */

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const BASE = (flag("--base-url") ?? "http://localhost:8787").replace(/\/$/, "");
const SECRET = flag("--secret") ?? process.env.WHETHER_CRON_SECRET ?? "e2e-secret";
const RUN = Date.now().toString(36);
const EXPLORER = `${BASE}/cdn-cgi/local/explorer/api/local/email/sending`;
const DAILY_CRON = "0 2 * * *";

let passed = 0;
const failures = [];

const check = (name, condition, detail) => {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
    return;
  }
  failures.push({ name, detail });
  console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
};

const textOf = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const post = (path, body = {}, headers = {}) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const formPost = (path, fields) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });

const authed = { authorization: `Bearer ${SECRET}` };

/** Distinct client addresses keep each scenario out of the shared rate-limit bucket. */
const client = (n) => ({ "cf-connecting-ip": `198.51.100.${n}` });

const listSent = async (attempt = 0) => {
  let response;
  try {
    response = await fetch(EXPLORER);
  } catch (error) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return listSent(attempt + 1);
    }
    throw new Error(`explorer unreachable: ${error}`);
  }
  if (!response.ok) {
    /* The local capture store is a dev aid with a row budget; a long session of
       repeated runs can fill it. Say so instead of failing the flow. */
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return listSent(attempt + 1);
    }
    throw new Error(`explorer ${response.status}: the local email store may be full — clear .wrangler/state and restart the worker`);
  }
  const payload = await response.json();
  return payload.result ?? [];
};

const detailOf = async (messageId) => {
  const url = new URL(EXPLORER);
  url.searchParams.set("email_id", messageId);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`explorer detail ${response.status}`);
  return (await response.json()).result;
};

/** Every mail to an address, oldest first, with its body. */
const mailsTo = async (address) => {
  const all = await listSent();
  const mine = all
    .filter((entry) => (entry.to ?? []).includes(address))
    .sort((left, right) => String(left.sentAt).localeCompare(String(right.sentAt)));
  return Promise.all(mine.map((entry) => detailOf(entry.messageId)));
};

/** Wait for a mail to an address that satisfies `predicate`. */
const waitForMail = async (address, predicate, { timeoutMs = 20000 } = {}) => {
  const deadline = Date.now() + timeoutMs;
  let seen = [];
  while (Date.now() < deadline) {
    seen = await mailsTo(address);
    const match = seen.find(predicate);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
};

const linkFrom = (mail, pattern) => mail?.text?.match(pattern)?.[0] ?? null;
const tokenFrom = (url) => (url ? new URL(url).searchParams.get("token") : null);

/**
 * The mail's links carry the deployed origin (`NEXT_PUBLIC_SITE_URL`), which is
 * whether.work even in a preview or a dev session. Point them at the worker under
 * test; the path and token are what the flow is about.
 */
const localUrl = (url) => {
  if (!url) return null;
  const parsed = new URL(url);
  return `${BASE}${parsed.pathname}${parsed.search}`;
};

const subscribe = async (email, body, clientIndex) => {
  const response = await post("/api/email/subscribe", { email, ...body }, client(clientIndex));
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
};

/** Subscribe, confirm through the mailed link, and hand back the standing state. */
const subscribeAndConfirm = async (email, body, clientIndex) => {
  const signup = await subscribe(email, body, clientIndex);
  if (signup.status !== 200) return { signup, mail: null, page: null };
  const mail = await waitForMail(email, (entry) => /Confirm/.test(entry.subject));
  const verifyUrl = localUrl(linkFrom(mail, /https?:\/\/\S*\/api\/email\/verify\?token=[0-9a-f-]+/));
  const token = tokenFrom(verifyUrl);
  if (!token) return { signup, mail, page: null };
  const confirm = await formPost("/api/email/verify", { token });
  return { signup, mail, page: { status: confirm.status, text: textOf(await confirm.text()) } };
};

async function main() {
  try {
    const health = await fetch(`${BASE}/api/health`);
    if (!health.ok) {
      console.error(`[setup] ${BASE}/api/health answered ${health.status}`);
      return 2;
    }
  } catch {
    console.error(`[setup] no worker answered at ${BASE}. Start one with:\n  bun run serve:worker -- --var WHETHER_CRON_SECRET:${SECRET}`);
    return 2;
  }

  const probe = await post("/api/email/send-weekly", {}, authed);
  if (probe.status === 503) {
    console.error(`[setup] the worker has no cron secret. Restart it with --var WHETHER_CRON_SECRET:${SECRET}`);
    return 2;
  }

  console.log(`\nemail e2e · ${BASE} · run ${RUN}\n`);

  /* ---------------------------------------------------------------- 1. signup */
  console.log("1. a new weekly subscriber");
  const weeklyAddress = `e2e-weekly-${RUN}@example.com`;
  const weekly = await subscribeAndConfirm(weeklyAddress, { weekly: true, alerts: true }, 11);
  check("subscribe answers 200", weekly.signup.status === 200, `status ${weekly.signup.status} ${JSON.stringify(weekly.signup.payload)}`);
  check("subscribe says to check the inbox", /check your email to confirm/i.test(weekly.signup.payload.message ?? ""), weekly.signup.payload.message);
  check("a confirmation mail was sent", Boolean(weekly.mail), "no mail captured for the address");
  check("subject names the confirmation", weekly.mail?.subject === "Confirm your Whether subscription", weekly.mail?.subject);
  check("the mail states what it will send", /weekly brief, plus an email when conditions change between Mondays/i.test(weekly.mail?.text ?? ""), weekly.mail?.text?.slice(0, 200));
  check("the mail says the link expires", /works for 7 days/i.test(weekly.mail?.text ?? ""), weekly.mail?.text?.slice(0, 200));
  check("confirming answers 200", weekly.page?.status === 200, `status ${weekly.page?.status}`);
  check("confirming says what now arrives", /This address now gets the Whether weekly brief/i.test(weekly.page?.text ?? ""), weekly.page?.text?.slice(0, 200));
  check("confirming promises an unsubscribe link", /Every email carries a link to unsubscribe/i.test(weekly.page?.text ?? ""), weekly.page?.text?.slice(0, 200));

  /* A second subscriber who only wants the brief, kept for the one-click check. */
  const clickAddress = `e2e-click-${RUN}@example.com`;
  const clicked = await subscribeAndConfirm(clickAddress, { weekly: true, alerts: false }, 12);
  check("a second subscriber confirms", /This address now gets/i.test(clicked.page?.text ?? ""), clicked.page?.text?.slice(0, 160));

  /* ------------------------------------------------- 3. the alert, via cron */
  console.log("\n2. the alert when conditions change");
  const primed = await fetch(`${BASE}/cdn-cgi/local/scheduled?cron=${encodeURIComponent(DAILY_CRON)}`, { method: "POST" });
  check("the scheduled handler runs", primed.ok, `status ${primed.status}`);
  const alertMail = await waitForMail(weeklyAddress, (entry) => (entry.subject ?? "").startsWith("Whether Alert —"));
  check("the alert arrived", Boolean(alertMail), "no alert captured");
  check("the alert names the new conditions", /CONDITIONS TURNED (CLOUDY|STORMY|SUNNY|FREEZING)/.test(alertMail?.text ?? ""), alertMail?.text?.slice(0, 200));
  check("the alert carries the week's action", /Action now:/.test(alertMail?.text ?? ""), alertMail?.text?.slice(0, 400));
  check("the alert carries what would change it", /Conditions change if:/.test(alertMail?.text ?? ""), alertMail?.text?.slice(0, 400));
  check("the alert carries a one-click unsubscribe link", /\/api\/email\/unsubscribe\?token=/.test(alertMail?.html ?? ""), "no unsubscribe link");
  check("the alert carries a plain-text part", (alertMail?.text ?? "").length > 120, `${(alertMail?.text ?? "").length} chars`);
  const alertLeaveUrl = localUrl(linkFrom(alertMail, /https?:\/\/\S*\/api\/email\/unsubscribe\?token=[0-9a-f-]+/));
  if (alertLeaveUrl) {
    const alertLeavePage = await fetch(alertLeaveUrl);
    const alertLeaveText = textOf(await alertLeavePage.text());
    check("the alert's footer link opens the unsubscribe page", /Unsubscribe from Whether\?/i.test(alertLeaveText), alertLeaveText.slice(0, 200));
  } else {
    check("the alert's footer link opens the unsubscribe page", false, "no unsubscribe link in the alert");
  }

  const alertCount = (await mailsTo(weeklyAddress)).filter((entry) => (entry.subject ?? "").startsWith("Whether Alert —")).length;
  await fetch(`${BASE}/cdn-cgi/local/scheduled?cron=${encodeURIComponent(DAILY_CRON)}`, { method: "POST" });
  const alertCountAgain = (await mailsTo(weeklyAddress)).filter((entry) => (entry.subject ?? "").startsWith("Whether Alert —")).length;
  check("a second run does not repeat the alert", alertCountAgain === alertCount, `${alertCount} → ${alertCountAgain} alerts`);
  check("the alerts-only subscriber got no alert", (await mailsTo(clickAddress)).every((entry) => !(entry.subject ?? "").startsWith("Whether Alert —")), "an address that opted out of alerts was mailed one");

  /* ------------------------------------------------------------ 4. the brief */
  console.log("\n3. the Monday brief");
  const unauth = await post("/api/email/send-weekly", {});
  check("send-weekly refuses a caller with no secret", unauth.status === 401, `status ${unauth.status}`);
  const wrongSecret = await post("/api/email/send-weekly", {}, { authorization: "Bearer not-the-secret" });
  check("send-weekly refuses a wrong secret", wrongSecret.status === 401, `status ${wrongSecret.status}`);

  const first = await post("/api/email/send-weekly", {}, authed).then((response) => response.json());
  check("send-weekly runs", first.ok === true, JSON.stringify(first));
  check("it sends to both confirmed subscribers", first.sent === 2, JSON.stringify(first));
  const briefMail = await waitForMail(weeklyAddress, (entry) => /^Whether (Brief )?—/.test(entry.subject) && !(entry.subject ?? "").startsWith("Whether Alert"));
  check("the brief arrived", Boolean(briefMail), "no brief captured");
  check("brief subject names the conditions", /Cloudy|Freezing|Stormy|Sunny/.test(briefMail?.subject ?? ""), briefMail?.subject);
  check("the brief states conditions and the guidance", /Conditions:/.test(briefMail?.text ?? "") && /Guidance:/.test(briefMail?.text ?? ""), briefMail?.text?.slice(0, 300));
  check("the brief carries the pause line", /Pause if:/.test(briefMail?.text ?? ""), briefMail?.text?.slice(0, 400));
  check("the brief carries a one-click unsubscribe link", /\/api\/email\/unsubscribe\?token=/.test(briefMail?.html ?? ""), "no unsubscribe link in the html");
  check("the brief carries a plain-text part", (briefMail?.text ?? "").length > 400, `${(briefMail?.text ?? "").length} chars`);
  const briefLink = linkFrom(briefMail, /https?:\/\/\S*\/api\/email\/unsubscribe\?token=[0-9a-f-]+/);
  check("the brief's links carry the host that sent it", Boolean(briefLink) && new URL(briefLink).origin === BASE, briefLink ?? "no unsubscribe link");

  const beforeSecond = (await mailsTo(weeklyAddress)).length;
  const second = await post("/api/email/send-weekly", {}, authed).then((response) => response.json());
  const afterSecond = (await mailsTo(weeklyAddress)).length;
  check("a second run does not repeat the brief", afterSecond === beforeSecond, `${beforeSecond} → ${afterSecond} mails (${JSON.stringify(second)})`);

  const forced = await post("/api/email/send-weekly?force=1", {}, authed).then((response) => response.json());
  const afterForce = (await mailsTo(weeklyAddress)).length;
  check("force=1 re-sends on request", afterForce === afterSecond + 1, `${afterSecond} → ${afterForce} mails (${JSON.stringify(forced)})`);

  /* --------------------------------------------------- 5. unconfirmed address */
  console.log("\n4. an address that never confirmed");
  const unconfirmedAddress = `e2e-unconfirmed-${RUN}@example.com`;
  const unconfirmed = await subscribe(unconfirmedAddress, { weekly: true, alerts: true }, 21);
  check("the request is accepted", unconfirmed.status === 200, `status ${unconfirmed.status}`);
  const unconfirmedSend = await post("/api/email/send-weekly", {}, authed).then((response) => response.json());
  check("the send list excludes it", unconfirmedSend.total === 2, `total ${unconfirmedSend.total} (${JSON.stringify(unconfirmedSend)})`);
  check("nothing but the confirmation is sent", (await mailsTo(unconfirmedAddress)).length === 1, "mail arrived before the address was confirmed");

  /* --------------------------------------------------- 6. alerts-only signup */
  console.log("\n5. an alerts-only subscriber");
  const alertsAddress = `e2e-alerts-${RUN}@example.com`;
  const alertsOnly = await subscribeAndConfirm(alertsAddress, { weekly: false, alerts: true }, 13);
  check("the confirmation says no weekly brief", /no weekly brief/i.test(alertsOnly.page?.text ?? ""), alertsOnly.page?.text?.slice(0, 220));
  const alertsCount = await post("/api/email/send-weekly", {}, authed).then((response) => response.json());
  check("the send list excludes them", alertsCount.total === 2, `total ${alertsCount.total} (${JSON.stringify(alertsCount)})`);
  check("the Monday brief skips them", (await mailsTo(alertsAddress)).length === 1, "more than the confirmation reached an alerts-only address");

  /* ------------------------------------------------------------ 6. plan lines */
  console.log("\n6. a subscriber who set their own lines");
  const planAddress = `e2e-plan-${RUN}@example.com`;
  const planLines = [
    {
      area: "hiring",
      pause: [{ metric: "tightness", operator: ">", value: 76 }],
      resume: [{ metric: "tightness", operator: "<", value: 66 }],
    },
  ];
  const planned = await subscribeAndConfirm(planAddress, { weekly: true, alerts: true, planLines, runwayBand: "balanced" }, 14);
  check("the confirmation names the lines it watches", /lines you set is crossed/i.test(planned.page?.text ?? ""), planned.page?.text?.slice(0, 260));
  check("the confirmation names the runway band", /12.24 months/i.test(planned.page?.text ?? ""), planned.page?.text?.slice(0, 260));

  const badLines = await post("/api/email/subscribe", { email: `e2e-bad-${RUN}@example.com`, planLines: [{ area: "hiring" }] }, client(15));
  check("an unparseable line is refused whole", badLines.status === 400, `status ${badLines.status}`);

  /* ------------------------------------------------------ 7. one-click leave */
  console.log("\n7. a mail client's one-click unsubscribe (RFC 8058)");
  const clickMail = await waitForMail(clickAddress, (entry) => /\/api\/email\/unsubscribe\?token=/.test(entry.text ?? ""));
  const clickUrl = localUrl(linkFrom(clickMail, /https?:\/\/\S*\/api\/email\/unsubscribe\?token=[0-9a-f-]+/));
  if (clickUrl) {
    const oneClick = await fetch(clickUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    });
    check("a one-click POST unsubscribes", /Unsubscribed/i.test(textOf(await oneClick.text())), `status ${oneClick.status}`);
  } else {
    check("a one-click POST unsubscribes", false, "no unsubscribe link in the brief");
  }

  /* ------------------------------------------------------- 8. unsubscribe */
  console.log("\n8. leaving through the footer link");
  const leaveUrl = localUrl(linkFrom(briefMail, /https?:\/\/\S*\/api\/email\/unsubscribe\?token=[0-9a-f-]+/));
  const leaveToken = tokenFrom(leaveUrl);
  check("the footer link is present", Boolean(leaveToken), leaveUrl ?? "no unsubscribe link in the brief");

  if (leaveToken) {
    const leavePage = await fetch(leaveUrl);
    const leaveText = textOf(await leavePage.text());
    check("opening the link changes nothing", /Unsubscribe from Whether\?/i.test(leaveText), leaveText.slice(0, 200));
    check("it says what stops", /stops every email Whether sends/i.test(leaveText), leaveText.slice(0, 220));

    const totalBefore = await post("/api/email/send-weekly", {}, authed).then((response) => response.json());
    const left = await formPost("/api/email/unsubscribe", { token: leaveToken });
    check("the button unsubscribes", /Unsubscribed/i.test(textOf(await left.text())), "no confirmation");

    const totalAfter = await post("/api/email/send-weekly", {}, authed).then((response) => response.json());
    check("the send list drops the address that left", totalAfter.total === totalBefore.total - 1, `${totalBefore.total} → ${totalAfter.total}`);

    const reopened = await fetch(leaveUrl);
    check("a second visit says it is already done", /Already unsubscribed/i.test(textOf(await reopened.text())), "wrong page");
  }

  /* --------------------------------------------------------- 9. dead links */
  console.log("\n9. links that should not work");
  const staleAddress = `e2e-stale-${RUN}@example.com`;
  await subscribe(staleAddress, { weekly: true }, 16);
  const firstMail = await waitForMail(staleAddress, (entry) => /Confirm/.test(entry.subject));
  const staleUrl = localUrl(linkFrom(firstMail, /https?:\/\/\S*\/api\/email\/verify\?token=[0-9a-f-]+/));
  await subscribe(staleAddress, { weekly: true }, 17);
  if (staleUrl) {
    const stale = await fetch(staleUrl);
    check("a replaced confirmation link is dead", stale.status === 410, `status ${stale.status}`);
  } else {
    check("a replaced confirmation link is dead", false, "no confirmation link in the first mail");
  }

  const unknown = await fetch(`${BASE}/api/email/verify?token=00000000-0000-4000-8000-000000000000`);
  check("an unknown token is dead", unknown.status === 410, `status ${unknown.status}`);
  const unknownLeave = await fetch(`${BASE}/api/email/unsubscribe?token=00000000-0000-4000-8000-000000000000`);
  check("an unknown unsubscribe token is not ours", unknownLeave.status === 404, `status ${unknownLeave.status}`);

  /* -------------------------------------------------------- 10. rate limit */
  console.log("\n10. the subscribe rate limit");
  let limited = false;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await post("/api/email/subscribe", { email: `e2e-limit-${RUN}-${attempt}@example.com` }, client(99));
    if (response.status === 429) {
      limited = true;
      break;
    }
  }
  check("a burst from one client is limited", limited, "8 requests in one window were all accepted");

  console.log(`\n${passed} passed, ${failures.length} failed\n`);
  if (failures.length > 0) {
    for (const failure of failures) console.log(`- ${failure.name}${failure.detail ? `: ${failure.detail}` : ""}`);
    return 1;
  }
  return 0;
}

process.exit(await main().catch((error) => {
  console.error(`\n[setup] ${error instanceof Error ? error.message : String(error)}`);
  console.error("Clear .wrangler/state and restart the worker for a clean run.");
  return 2;
}));
