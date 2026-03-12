#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const EXIT = { OK: 0, ERROR: 1, AUTH_CONFIG: 2, NO_DATA: 3, WATCH_TRIGGER: 4, INVALID_SCENARIO: 5 };
const CONFIG_PATH = path.join(os.homedir(), ".config", "whether", "config.yaml");

const HELP = `Whether CLI — decision terminal for operators

Usage:
  whether <command> [flags]

Core Commands:
  status        Show current operating environment and call
  call          Show leadership recommendation
  changes       Show what changed since last refresh
  regime        Show regime and confidence
  diagnostics   Show supporting drivers and evidence
  history       Show historical regimes and calls
  brief         Generate formatted briefing output
  explain       Explain the current regime or call
  scenario      Run what-if analysis

Workflow:
  export        Export reports and machine-readable outputs
  share         Share to configured channels
  watch         Live refresh mode

Setup:
  auth          Login and token management
  config        Manage local configuration
  doctor        Diagnose CLI or API setup
  completion    Print shell completion hint
`;

const SUB_HELP = {
  call: "Usage: whether call [show|copy|diff] [--json|--yaml|--markdown]",
  diagnostics: "Usage: whether diagnostics [summary|drivers|evidence|provenance] [--json]",
  history: "Usage: whether history [compare] [--weeks <n>] [--json]",
  brief: "Usage: whether brief [exec|board|staff|investor|slack|email] [--copy]",
  export: "Usage: whether export [json|csv|markdown|pdf|briefing] [--output <file>]",
  share: "Usage: whether share [slack|email|clipboard] [--brief <type>]",
  auth: "Usage: whether auth [login|logout|status] [--token <token>]",
  config: "Usage: whether config [init|get|set <key> <value>]",
  company: "Usage: whether company [list|select|status|call|brief] [name]",
};

const parseArgs = (argv) => {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return { command: positionals[0] ?? "status", subcommand: positionals[1] ?? null, args: positionals.slice(2), flags };
};

const parseConfig = (raw) =>
  Object.fromEntries(
    raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes(":"))
      .map((line) => {
        const index = line.indexOf(":");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );

const toYaml = (value, depth = 0) => {
  const prefix = "  ".repeat(depth);
  if (Array.isArray(value)) {
    return value.map((item) => `${prefix}- ${typeof item === "object" && item !== null ? `\n${toYaml(item, depth + 1)}` : item}`).join("\n");
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => (v && typeof v === "object" ? `${prefix}${k}:\n${toYaml(v, depth + 1)}` : `${prefix}${k}: ${v}`))
      .join("\n");
  }
  return `${prefix}${String(value)}`;
};

const loadConfig = async () => {
  try {
    return parseConfig(await fs.readFile(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
};

const saveConfig = async (data) => {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, `${Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("\n")}\n`, "utf8");
};

const writeOutput = (payload, settings) => {
  if (settings.quiet) return;
  if (settings.output === "json") {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  if (settings.output === "yaml") {
    console.log(toYaml(payload));
    return;
  }
  if (settings.output === "markdown") {
    console.log(typeof payload === "string" ? payload : `\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``);
    return;
  }
  console.log(payload);
};

const normalizeFlags = async (flags) => {
  const config = await loadConfig();
  return {
    config,
    output: flags.json ? "json" : flags.yaml ? "yaml" : flags.markdown ? "markdown" : flags.output ?? config.output ?? "text",
    quiet: Boolean(flags.quiet),
    noColor: Boolean(flags["no-color"]),
    apiBaseUrl: flags["api-base-url"] ?? process.env.WHETHER_API_URL ?? config.api_base_url ?? "http://localhost:3000",
    token: flags.token ?? process.env.WHETHER_TOKEN ?? config.token ?? null,
    profile: process.env.WHETHER_PROFILE ?? config.profile ?? "default",
  };
};

const getJson = async (settings, endpoint) => {
  const response = await fetch(`${settings.apiBaseUrl}${endpoint}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(settings.token ? { authorization: `Bearer ${settings.token}` } : {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    const error = new Error("Authentication failed. Run `whether auth login --token <token>`.");
    error.exitCode = EXIT.AUTH_CONFIG;
    throw error;
  }
  if (response.status === 404) {
    const error = new Error("No data available.");
    error.exitCode = EXIT.NO_DATA;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`Request failed (${response.status})`);
    error.exitCode = EXIT.ERROR;
    throw error;
  }
  return response.json();
};

const statusText = (body) => `Whether — Current Status

Regime:             ${body.regime}
Cycle Phase:        ${body.cyclePhase}
Confidence:         ${body.confidence.label} (${body.confidence.score})
Trend:              ${body.trend}
Decision Stability: ${body.decisionStability}
Updated:            ${body.updatedAt}

This Week's Call:
${body.call.summary}

Do:
${body.call.do.map((item) => `- ${item}`).join("\n")}

Avoid:
${body.call.avoid.map((item) => `- ${item}`).join("\n")}

Flip Conditions:
${body.call.flipConditions.map((item) => `- ${item}`).join("\n")}`;

const statusExpandedText = (body) => `Whether — Current Status (Expanded)

Regime:             ${body.regime}
Cycle Phase:        ${body.cyclePhase}
Confidence:         ${body.confidence.label} (${body.confidence.score})
Trend:              ${body.trend}
Decision Stability: ${body.decisionStability}
Updated:            ${body.updatedAt}

This Week's Call:
${body.call.summary}

Guardrails:
- Threshold: ${body.guardrails.threshold}
- Reversal trigger: ${body.guardrails.reversalTrigger}

Bounded decision:
- Action: ${body.boundedDecisionSummary.action}
- Threshold: ${body.boundedDecisionSummary.threshold}
- Reversal: ${body.boundedDecisionSummary.reversalCondition}

Top signal deltas:
${body.boundedDecisionSummary.topSignalDeltas.map((item) => `- ${item.metric}: ${item.direction} ${Math.abs(item.delta)} (${item.impact})`).join("\n")}

Compact flip conditions:
${body.flipConditionsCompact.map((item) => `- ${item}`).join("\n")}

Trust:
- ${body.trust.cueLine}
- ${body.trust.compactSummary}
- Freshness: ${body.trust.freshness}
- Provenance: ${body.trust.provenanceStatus}
${body.trust.warnings.length ? `- Warnings:
${body.trust.warnings.map((item) => `  - ${item.warning}`).join("\n")}` : "- Warnings: none"}`;

const callText = (body) => `Call: ${body.call}\n\nLeadership should:\n${body.leadershipShould.map((item) => `- ${item}`).join("\n")}\n\nWatch:\n${body.watch.map((item) => `- ${item}`).join("\n")}`;
const changesText = (body) => `What Changed Since Last Refresh\n\nCHANGED\n${body.changed.map((item) => `- ${item.metric} ${item.from} → ${item.to} (${item.direction}, ${item.impact})`).join("\n")}\n\nREVISIT\n${body.revisit.map((item) => `- ${item}`).join("\n")}\n\nFLIP\n${body.flip.map((item) => `- ${item.condition}${typeof item.distance === "number" ? ` (${item.distance} away)` : ""}`).join("\n")}`;

const routeWithCommonParams = (base, flags) => {
  const params = new URLSearchParams();
  if (flags["as-of"]) params.set("asOf", String(flags["as-of"]));
  if (flags.company) params.set("company", String(flags.company));
  if (flags.stage) params.set("stage", String(flags.stage));
  if (flags.verbose && !flags.view) params.set("view", "expanded");
  if (flags.view) params.set("view", String(flags.view));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
};

const writeFileIfRequested = async (flags, payload, settings) => {
  if (!flags.output) return;
  const content = settings.output === "json" ? JSON.stringify(payload, null, 2) : settings.output === "yaml" ? toYaml(payload) : typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  await fs.writeFile(String(flags.output), `${content}\n`, "utf8");
};

const cmdStatus = async (settings, flags) => {
  const body = await getJson(settings, routeWithCommonParams("/api/cli/status", flags));
  const rendered = flags.summary
    ? body.call.summary
    : body.view === "expanded"
      ? statusExpandedText(body)
      : statusText(body);
  await writeFileIfRequested(flags, rendered, settings);
  writeOutput(settings.output === "text" ? rendered : body, settings);
};

const cmdCall = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.call, settings);
  const body = await getJson(settings, routeWithCommonParams("/api/cli/call", flags));

  if (subcommand === "diff") {
    const from = flags.from ?? "previous";
    const to = flags.to ?? "current";
    return writeOutput(`Call diff (${from} -> ${to})\n\nCurrent call:\n${body.call}`, settings);
  }

  const rendered = callText(body);
  if (subcommand === "copy" || flags.copy) {
    return writeOutput(rendered, settings);
  }

  writeOutput(settings.output === "text" ? rendered : body, settings);
};

const cmdRegime = async (settings, flags) => {
  const body = await getJson(settings, routeWithCommonParams("/api/cli/regime", flags));
  if (flags.plot) {
    const history = await getJson(settings, "/api/cli/history");
    const plot = history.history.map((item) => `${item.recordDate}  ${item.regime}  ${item.trend}`).join("\n");
    return writeOutput(`Regime history\n${plot}`, settings);
  }
  const text = `Regime: ${body.regime}\nPhase: ${body.phase}\nConfidence: ${body.confidence}\nTrend: ${body.trend}\n\nInterpretation:\n${body.interpretation}`;
  writeOutput(settings.output === "text" ? text : body, settings);
};

const cmdChanges = async (settings, flags) => {
  const body = await getJson(settings, routeWithCommonParams("/api/cli/changes", flags));
  writeOutput(settings.output === "text" ? changesText(body) : body, settings);
};

const cmdDiagnostics = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.diagnostics, settings);
  const body = await getJson(settings, "/api/cli/diagnostics");
  if (subcommand === "provenance") {
    const status = await getJson(settings, "/api/cli/status");
    return writeOutput({ updatedAt: status.updatedAt, confidence: status.confidence, degraded: status.degraded }, settings);
  }
  if (subcommand === "evidence") {
    const metric = flags.metric ? String(flags.metric).toLowerCase() : null;
    const filtered = metric ? body.topDrivers.filter((driver) => driver.title.toLowerCase().includes(metric)) : body.topDrivers;
    return writeOutput(settings.output === "text" ? filtered.map((item, idx) => `${idx + 1}. ${item.title} (${item.directionLabel})`).join("\n") : { ...body, topDrivers: filtered }, settings);
  }
  writeOutput(body, settings);
};

const cmdHistory = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.history, settings);
  const body = await getJson(settings, "/api/cli/history");
  if (subcommand === "compare") {
    return writeOutput(`Compare mode (${flags.from ?? "start"} -> ${flags.to ?? "end"})\n${body.history[0]?.recordDate ?? "n/a"} latest snapshot`, settings);
  }
  const weeks = Number(flags.weeks ?? 12);
  const items = body.history.slice(0, weeks);
  const text = `Recent History\n\n${items.map((item) => `${item.recordDate}  ${item.regime}  ${item.confidenceLabel}  ${item.trend}`).join("\n")}`;
  writeOutput(settings.output === "text" ? text : { ...body, history: items }, settings);
};

const cmdBrief = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.brief, settings);
  const variant = subcommand ?? "exec";
  const body = await getJson(settings, "/api/brief/slack");
  const prefix = variant === "board" ? "Board brief" : variant === "staff" ? "Staff brief" : variant === "investor" ? "Investor brief" : variant === "email" ? "Email brief" : "Exec brief";
  const rendered = `${prefix}\n\n${body.brief}`;
  await writeFileIfRequested(flags, rendered, settings);
  writeOutput(settings.output === "text" ? rendered : body, settings);
};

const cmdExport = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.export, settings);
  const format = subcommand ?? "json";
  const status = await getJson(settings, "/api/cli/status");
  const changes = await getJson(settings, "/api/cli/changes");
  const payload = { status, changes };

  if (format === "csv") {
    const csv = ["metric,from,to,direction,impact", ...changes.changed.map((item) => `${item.metric},${item.from},${item.to},${item.direction},${item.impact}`)].join("\n");
    await writeFileIfRequested({ ...flags, output: flags.output ?? "whether-export.csv" }, csv, { ...settings, output: "text" });
    return writeOutput(csv, settings);
  }

  const rendered = format === "markdown" || format === "briefing" ? `# Whether Export\n\n## Call\n${status.call.summary}\n\n## Changes\n${changes.changed.map((item) => `- ${item.metric}: ${item.from} → ${item.to}`).join("\n")}` : payload;
  await writeFileIfRequested(flags, rendered, settings);
  writeOutput(rendered, settings);
};

const cmdShare = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.share, settings);
  const briefType = flags.brief ?? "exec";
  const body = await getJson(settings, "/api/brief/slack");
  const message = `[share:${subcommand ?? "clipboard"}] (${briefType})\n${body.brief}`;
  writeOutput(message, settings);
};

const cmdExplain = async (settings, subcommand, flags) => {
  const regime = await getJson(settings, "/api/cli/regime");
  const changes = await getJson(settings, "/api/cli/changes");
  if (subcommand === "metric") {
    return writeOutput(`Metric explanation (${flags.metric ?? "unknown"}): signals changed and should be interpreted through current posture constraints.`, settings);
  }
  const text = subcommand === "flip"
    ? `Flip conditions:\n${changes.flip.map((item) => `- ${item.condition}`).join("\n")}`
    : subcommand === "call"
      ? `Why this call? ${regime.interpretation}`
      : `Why "${regime.regime}"?\n${regime.interpretation}`;
  writeOutput(text, settings);
};

const cmdScenario = async (settings, flags) => {
  if ((flags.tightness && Number.isNaN(Number(flags.tightness))) || (flags["risk-appetite"] && Number.isNaN(Number(flags["risk-appetite"])))) {
    process.exit(EXIT.INVALID_SCENARIO);
  }
  const query = new URLSearchParams();
  if (flags.tightness !== undefined) query.set("tightness", String(flags.tightness));
  if (flags["risk-appetite"] !== undefined) query.set("risk-appetite", String(flags["risk-appetite"]));
  const body = await getJson(settings, `/api/cli/scenario?${query.toString()}`);
  writeOutput(body, settings);
};

const cmdCompany = async (settings, subcommand, args, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.company, settings);
  if (subcommand === "list") return writeOutput("- default", settings);
  if (subcommand === "select") {
    const config = await loadConfig();
    const company = args[0];
    if (!company) process.exit(EXIT.AUTH_CONFIG);
    await saveConfig({ ...config, default_company: company });
    return writeOutput(`Selected company: ${company}`, settings);
  }
  const company = args[0] ?? flags.company;
  if (!company) return writeOutput("Provide a company name.", settings);
  if (subcommand === "call") return cmdCall(settings, "show", { ...flags, company });
  if (subcommand === "brief") return cmdBrief(settings, "board", { ...flags, company });
  return cmdStatus(settings, { ...flags, company });
};

const cmdRaw = async (settings, subcommand) => {
  const endpoint = subcommand ?? "/api/cli/status";
  const body = await getJson(settings, endpoint.startsWith("/") ? endpoint : `/${endpoint}`);
  writeOutput(body, settings);
};

const cmdDoctor = async (settings) => {
  const checks = [];
  try {
    await getJson(settings, "/api/health");
    checks.push({ name: "api/health", status: "ok" });
  } catch (error) {
    checks.push({ name: "api/health", status: "error", message: error.message });
  }
  const config = await loadConfig();
  checks.push({ name: "configPath", status: "ok", path: CONFIG_PATH, profile: config.profile ?? "default" });
  writeOutput(checks, settings);
};

const cmdConfig = async (settings, subcommand, args, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.config, settings);
  const config = await loadConfig();
  if (subcommand === "init") {
    await saveConfig({ profile: "default", workspace: "default", timezone: "America/New_York", output: "text", api_base_url: settings.apiBaseUrl });
    return writeOutput(`Initialized ${CONFIG_PATH}`, settings);
  }
  if (subcommand === "set") {
    const [key, value] = args;
    if (!key || !value) process.exit(EXIT.AUTH_CONFIG);
    await saveConfig({ ...config, [key]: value });
    return writeOutput(`${key}=${value}`, settings);
  }
  writeOutput(config, settings);
};

const cmdAuth = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.auth, settings);
  const config = await loadConfig();
  if (subcommand === "login") {
    const token = flags.token;
    if (!token || typeof token !== "string") process.exit(EXIT.AUTH_CONFIG);
    await saveConfig({ ...config, token });
    return writeOutput("Token saved.", settings);
  }
  if (subcommand === "logout") {
    const { token: _token, ...rest } = config;
    await saveConfig(rest);
    return writeOutput("Logged out.", settings);
  }
  writeOutput(config.token ? "Authenticated" : "Not authenticated", settings);
};

const cmdWatch = async (settings, flags) => {
  const intervalMs = Number(flags.interval ?? 60) * 1000;
  const changesOnly = Boolean(flags["changes-only"]);
  let previousFrame = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const body = await getJson(settings, changesOnly ? "/api/cli/changes" : "/api/cli/status");
    const frame = changesOnly ? changesText(body) : statusText(body);
    if (frame !== previousFrame) {
      writeOutput(`[${new Date().toISOString()}]\n${frame}\n`, settings);
      previousFrame = frame;
    }
    if (changesOnly && body.flip.some((item) => typeof item.distance === "number" && item.distance <= 0)) {
      process.exit(EXIT.WATCH_TRIGGER);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

const main = async () => {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.command === "--help" || parsed.command === "help") {
    console.log(HELP);
    return;
  }

  if (parsed.flags.help && !SUB_HELP[parsed.command]) {
    console.log(HELP);
    return;
  }

  const settings = await normalizeFlags(parsed.flags);

  try {
    switch (parsed.command) {
      case "status":
        return cmdStatus(settings, parsed.flags);
      case "call":
        return cmdCall(settings, parsed.subcommand ?? "show", parsed.flags);
      case "regime":
        return cmdRegime(settings, parsed.flags);
      case "changes":
        return cmdChanges(settings, parsed.flags);
      case "diagnostics":
        return cmdDiagnostics(settings, parsed.subcommand ?? "summary", parsed.flags);
      case "history":
        return cmdHistory(settings, parsed.subcommand, parsed.flags);
      case "brief":
        return cmdBrief(settings, parsed.subcommand, parsed.flags);
      case "export":
        return cmdExport(settings, parsed.subcommand, parsed.flags);
      case "share":
        return cmdShare(settings, parsed.subcommand, parsed.flags);
      case "explain":
        return cmdExplain(settings, parsed.subcommand, parsed.flags);
      case "scenario":
        return cmdScenario(settings, parsed.flags);
      case "company":
        return cmdCompany(settings, parsed.subcommand, parsed.args, parsed.flags);
      case "watch":
        return cmdWatch(settings, parsed.flags);
      case "config":
        return cmdConfig(settings, parsed.subcommand ?? "get", parsed.args, parsed.flags);
      case "auth":
        return cmdAuth(settings, parsed.subcommand ?? "status", parsed.flags);
      case "raw":
        return cmdRaw(settings, parsed.subcommand);
      case "doctor":
        return cmdDoctor(settings);
      case "completion":
        return writeOutput("Shell completion is available via `whether completion` (zsh/bash integration planned).", settings);
      default:
        writeOutput(HELP, settings);
        process.exit(EXIT.ERROR);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(error.exitCode ?? EXIT.ERROR);
  }
};

main();
