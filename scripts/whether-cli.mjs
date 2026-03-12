#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const EXIT = { OK: 0, ERROR: 1, AUTH_CONFIG: 2, NO_DATA: 3, WATCH_TRIGGER: 4, INVALID_SCENARIO: 5 };
const CONFIG_PATH = path.join(os.homedir(), ".config", "whether", "config.yaml");
const ERROR_CATEGORY = {
  AUTH: "auth",
  NETWORK: "network",
  FORBIDDEN: "forbidden",
  RATE_LIMIT: "rate limit",
  SERVER_FAULT: "server fault",
};

const HELP = `Whether CLI — decision terminal for operators

Usage:
  whether <command> [flags]

Core Commands:
  status        Show current operating environment and call (use --verbose for bounded decision detail)
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
  status: "Usage: whether status [--verbose|--view expanded] [--json] [--as-of <date>]",
  diagnostics: "Usage: whether diagnostics [summary|drivers|evidence|provenance] [--json] [--as-of <date>]",
  history: "Usage: whether history [compare] [--weeks <n>] [--json] [--as-of <date>]",
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

const getCategoryRemediation = (category, settings) => {
  const healthUrl = `${settings.apiBaseUrl}/api/health`;
  switch (category) {
    case ERROR_CATEGORY.AUTH:
      return "Set WHETHER_TOKEN or pass --token, then run `whether auth login --token <token>`.";
    case ERROR_CATEGORY.NETWORK:
      return `Set WHETHER_API_URL or pass --api-base-url, then verify ${healthUrl}.`;
    case ERROR_CATEGORY.FORBIDDEN:
      return "Use a token with required access via WHETHER_TOKEN or --token, then retry.";
    case ERROR_CATEGORY.RATE_LIMIT:
      return "Retry with --watch --interval 120 or wait for quota reset at /api/cli/status.";
    case ERROR_CATEGORY.SERVER_FAULT:
      return `Run \`whether doctor\` and verify ${healthUrl} is healthy before retrying.`;
    default:
      return "Retry the command or run `whether doctor`.";
  }
};

const buildCliError = ({ category, summary, settings, cause, exitCode = EXIT.ERROR }) => {
  const remediation = getCategoryRemediation(category, settings);
  const error = new Error(`${category}: ${summary} ${remediation}`, { cause });
  error.exitCode = exitCode;
  error.category = category;
  error.remediation = remediation;
  return error;
};

const getJson = async (settings, endpoint) => {
  let response;
  try {
    response = await fetch(`${settings.apiBaseUrl}${endpoint}`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(settings.token ? { authorization: `Bearer ${settings.token}` } : {}),
      },
    });
  } catch (cause) {
    throw buildCliError({
      category: ERROR_CATEGORY.NETWORK,
      summary: "Unable to reach Whether API.",
      settings,
      cause,
    });
  }

  if (response.status === 401) {
    throw buildCliError({
      category: ERROR_CATEGORY.AUTH,
      summary: "Authentication failed.",
      settings,
      cause: new Error(`HTTP ${response.status} for ${endpoint}`),
      exitCode: EXIT.AUTH_CONFIG,
    });
  }
  if (response.status === 403) {
    throw buildCliError({
      category: ERROR_CATEGORY.FORBIDDEN,
      summary: "Access denied by API.",
      settings,
      cause: new Error(`HTTP ${response.status} for ${endpoint}`),
      exitCode: EXIT.AUTH_CONFIG,
    });
  }
  if (response.status === 429) {
    throw buildCliError({
      category: ERROR_CATEGORY.RATE_LIMIT,
      summary: "Request quota exceeded.",
      settings,
      cause: new Error(`HTTP ${response.status} for ${endpoint}`),
    });
  }
  if (response.status >= 500) {
    throw buildCliError({
      category: ERROR_CATEGORY.SERVER_FAULT,
      summary: `API returned ${response.status}.`,
      settings,
      cause: new Error(`HTTP ${response.status} for ${endpoint}`),
    });
  }
  if (response.status === 404) {
    const error = new Error("No data available.");
    error.exitCode = EXIT.NO_DATA;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`Request failed (${response.status})`, {
      cause: new Error(`HTTP ${response.status} for ${endpoint}`),
    });
    error.exitCode = EXIT.ERROR;
    throw error;
  }
  return response.json();
};


const freshnessText = (body) => {
  if (body.freshness?.line) return body.freshness.line;
  const updated = body.updatedAt ?? "Unavailable";
  const confidence = body.confidence?.label ? String(body.confidence.label).toLowerCase() : "unknown";
  const degraded = body.degraded ? "degraded" : "live";
  return `Updated ${updated} · ${degraded} · ${confidence}-reliability`;
};

const statusText = (body) => `Whether — Current Status\n\nRegime:             ${body.regime}\nCycle Phase:        ${body.cyclePhase}\nConfidence:         ${body.confidence.label} (${body.confidence.score})\nTrend:              ${body.trend}\nDecision Stability: ${body.decisionStability}\nFreshness:          ${freshnessText(body)}\n\nThis Week's Call:\n${body.call.summary}\n\nDo:\n${body.call.do.map((item) => `- ${item}`).join("\n")}\n\nAvoid:\n${body.call.avoid.map((item) => `- ${item}`).join("\n")}\n\nFlip Conditions:\n${body.call.flipConditions.map((item) => `- ${item}`).join("\n")}`;

const callText = (body) => `Call: ${body.call}
Freshness: ${freshnessText(body)}\n\nLeadership should:\n${body.leadershipShould.map((item) => `- ${item}`).join("\n")}\n\nWatch:\n${body.watch.map((item) => `- ${item}`).join("\n")}`;
const changesText = (body) => `What Changed Since Last Refresh
Freshness: ${freshnessText(body)}\n\nCHANGED\n${body.changed.map((item) => `- ${item.metric} ${item.from} → ${item.to} (${item.direction}, ${item.impact})`).join("\n")}\n\nREVISIT\n${body.revisit.map((item) => `- ${item}`).join("\n")}\n\nFLIP\n${body.flip.map((item) => `- ${item.condition}${typeof item.distance === "number" ? ` (${item.distance} away)` : ""}`).join("\n")}`;

const routeWithParams = (base, flags, allowedParams) => {
  const params = new URLSearchParams();
  for (const [flagName, queryName] of allowedParams) {
    const value = flags[flagName];
    if (value !== undefined && value !== null) {
      params.set(queryName, String(value));
    }
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
};

const writeFileIfRequested = async (flags, payload, settings) => {
  if (!flags.output) return;
  const content = settings.output === "json" ? JSON.stringify(payload, null, 2) : settings.output === "yaml" ? toYaml(payload) : typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  await fs.writeFile(String(flags.output), `${content}\n`, "utf8");
};

const cmdStatus = async (settings, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.status, settings);
  const route = routeWithParams("/api/cli/status", {
    ...flags,
    view: flags.verbose || flags.view === "expanded" ? "expanded" : undefined,
  }, [["as-of", "asOf"], ["view", "view"]]);
  const body = await getJson(settings, route);
  const expandedTail = body.view === "expanded"
    ? `

Bounded Decision:
Guardrail: ${body.boundedDecision.guardrailThreshold}
Reversal: ${body.boundedDecision.reversalTrigger}
Flip (compact):
${body.boundedDecision.flipConditionsCompact.map((item) => `- ${item}`).join("\n")}
Top deltas:
${body.boundedDecision.topDeltas.map((item) => `- ${item.metric} ${item.direction} (${item.delta})`).join("\n")}`
    : "";
  const rendered = flags.summary ? body.call.summary : `${statusText(body)}${expandedTail}`;
  await writeFileIfRequested(flags, rendered, settings);
  writeOutput(settings.output === "text" ? rendered : body, settings);
};

const cmdCall = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.call, settings);
  const body = await getJson(settings, routeWithParams("/api/cli/call", flags, [["as-of", "asOf"]]));

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
  const body = await getJson(settings, routeWithParams("/api/cli/regime", flags, [["as-of", "asOf"]]));
  if (flags.plot) {
    const history = await getJson(settings, "/api/cli/history");
    const plot = history.history.map((item) => `${item.recordDate}  ${item.regime}  ${item.trend}`).join("\n");
    return writeOutput(`Regime history\n${plot}`, settings);
  }
  const text = `Regime: ${body.regime}\nPhase: ${body.phase}\nConfidence: ${body.confidence}\nTrend: ${body.trend}\n\nInterpretation:\n${body.interpretation}`;
  writeOutput(settings.output === "text" ? text : body, settings);
};

const cmdChanges = async (settings, flags) => {
  const body = await getJson(settings, routeWithParams("/api/cli/changes", flags, [["as-of", "asOf"]]));
  writeOutput(settings.output === "text" ? changesText(body) : body, settings);
};

const cmdDiagnostics = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.diagnostics, settings);
  const body = await getJson(settings, routeWithParams("/api/cli/diagnostics", flags, [["as-of", "asOf"]]));
  if (subcommand === "provenance") {
    const status = await getJson(settings, routeWithParams("/api/cli/status", flags, [["as-of", "asOf"]]));
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
  const body = await getJson(settings, routeWithParams("/api/cli/history", flags, [["as-of", "asOf"], ["weeks", "weeks"]]));
  if (subcommand === "compare") {
    return writeOutput(`Compare mode (${flags.from ?? "start"} -> ${flags.to ?? "end"})
${body.history[0]?.recordDate ?? "n/a"} latest snapshot`, settings);
  }
  const text = `Recent History (${body.windowWeeks}w, max ${body.maxWeeks})

${body.history.map((item) => `${item.recordDate}  ${item.regime}  ${item.confidenceLabel}  ${item.trend}`).join("\n")}`;
  writeOutput(settings.output === "text" ? text : body, settings);
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

  if (parsed.flags.help && process.argv.slice(2).every((token) => token.startsWith("--"))) {
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
        await cmdStatus(settings, parsed.flags);
        return;
      case "call":
        await cmdCall(settings, parsed.subcommand ?? "show", parsed.flags);
        return;
      case "regime":
        await cmdRegime(settings, parsed.flags);
        return;
      case "changes":
        await cmdChanges(settings, parsed.flags);
        return;
      case "diagnostics":
        await cmdDiagnostics(settings, parsed.subcommand ?? "summary", parsed.flags);
        return;
      case "history":
        await cmdHistory(settings, parsed.subcommand, parsed.flags);
        return;
      case "brief":
        await cmdBrief(settings, parsed.subcommand, parsed.flags);
        return;
      case "export":
        await cmdExport(settings, parsed.subcommand, parsed.flags);
        return;
      case "share":
        await cmdShare(settings, parsed.subcommand, parsed.flags);
        return;
      case "explain":
        await cmdExplain(settings, parsed.subcommand, parsed.flags);
        return;
      case "scenario":
        await cmdScenario(settings, parsed.flags);
        return;
      case "company":
        await cmdCompany(settings, parsed.subcommand, parsed.args, parsed.flags);
        return;
      case "watch":
        await cmdWatch(settings, parsed.flags);
        return;
      case "config":
        await cmdConfig(settings, parsed.subcommand ?? "get", parsed.args, parsed.flags);
        return;
      case "auth":
        await cmdAuth(settings, parsed.subcommand ?? "status", parsed.flags);
        return;
      case "raw":
        await cmdRaw(settings, parsed.subcommand);
        return;
      case "doctor":
        await cmdDoctor(settings);
        return;
      case "completion":
        writeOutput("Shell completion is available via `whether completion` (zsh/bash integration planned).", settings);
        return;
      default:
        writeOutput(HELP, settings);
        process.exit(EXIT.ERROR);
    }
  } catch (error) {
    const knownError = error instanceof Error ? error : new Error(String(error));
    console.error(knownError.message);
    if (knownError.cause instanceof Error && knownError.cause.message) {
      console.error(`Cause: ${knownError.cause.message}`);
    }
    process.exit(knownError.exitCode ?? EXIT.ERROR);
  }
};

main();
