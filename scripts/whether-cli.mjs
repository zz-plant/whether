#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts } from "pdf-lib";

const EXIT = { OK: 0, ERROR: 1, AUTH_CONFIG: 2, NO_DATA: 3, WATCH_TRIGGER: 4, INVALID_SCENARIO: 5 };
EXIT.NETWORK = 6;
EXIT.SERVER = 7;
const CONFIG_PATH = path.join(os.homedir(), ".config", "whether", "config.yaml");
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_JSON_PATH = path.join(SCRIPT_DIR, "..", "package.json");
const ERROR_CATEGORY = {
  AUTH: "auth",
  NETWORK: "network",
  FORBIDDEN: "forbidden",
  RATE_LIMIT: "rate limit",
  SERVER_FAULT: "server fault",
};

const AUTH_FAILURE = {
  MISSING: "missing",
  EXPIRED: "expired",
  INVALID: "invalid",
  SCOPE: "scope",
};

const AUTH_CHECK_ENDPOINT = "/api/auth/status";

const HELP = `Whether CLI — decision terminal for operators

Usage:
  whether <command> [flags]
  whether --version

Core Commands:
  ping          Verify API reachability and auth readiness
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
  install       Bootstrap local CLI configuration for this machine
  auth          Login and token management
  config        Manage local configuration
  doctor        Diagnose CLI or API setup
  completion    Print shell completion script
`;

const SUB_HELP = {
  ping: "Usage: whether ping [--json]",
  call: "Usage: whether call [show|copy|diff] [--json|--yaml|--markdown]",
  status: "Usage: whether status [--verbose|--view expanded] [--json] [--as-of <YYYY-MM>] (example: --as-of 2024-07)",
  diagnostics: "Usage: whether diagnostics [summary|drivers|evidence|provenance] [--json] [--as-of <YYYY-MM>] (example: --as-of 2024-07)",
  history: "Usage: whether history [compare] [--weeks <n>] [--json] [--as-of <YYYY-MM>] (example: --as-of 2024-07)",
  brief: "Usage: whether brief [exec|board|staff|investor|slack|email] [--copy]",
  export: "Usage: whether export [json|csv|markdown|pdf|briefing] [--output <file>]",
  share: "Usage: whether share [slack|email|clipboard] [--brief <type>]",
  install:
    "Usage: whether install [--yes|--ci] [--api-base-url <url>] [--token <token>]\n\nNon-interactive modes:\n  --yes   Skip prompts and accept defaults\n  --ci    CI alias for --yes",
  auth: "Usage: whether auth [login|logout|status] [--token <token>] [--check] [--json]",
  config: "Usage: whether config [init|get|set <key> <value>]",
  company: "Usage: whether company [list|select|status|call|brief] [name]",
  completion: "Usage: whether completion [--shell <bash|zsh>]",
};

let cachedVersion = null;

const readCliVersion = async () => {
  if (cachedVersion) return cachedVersion;
  try {
    const parsed = JSON.parse(await fs.readFile(PACKAGE_JSON_PATH, "utf8"));
    cachedVersion = String(parsed.version ?? "0.0.0");
    return cachedVersion;
  } catch {
    cachedVersion = "0.0.0";
    return cachedVersion;
  }
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
    const eqIndex = token.indexOf("=");
    if (eqIndex !== -1) {
      const key = token.slice(2, eqIndex);
      flags[key] = token.slice(eqIndex + 1);
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

const serializePayload = (payload, output) => {
  if (output === "json") {
    return JSON.stringify(payload, null, 2);
  }
  if (output === "yaml") {
    return toYaml(payload);
  }
  if (output === "markdown") {
    return typeof payload === "string" ? payload : `\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
  }
  return typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
};

const writeOutput = (payload, settings) => {
  if (settings.quiet) return;
  console.log(serializePayload(payload, settings.output));
};

const normalizeFlags = async (flags) => {
  const config = await loadConfig();
  const envToken = process.env.WHETHER_API_KEY ?? process.env.WHETHER_TOKEN ?? null;
  return {
    config,
    output: flags.json ? "json" : flags.yaml ? "yaml" : flags.markdown ? "markdown" : flags.format ?? config.output ?? "text",
    quiet: Boolean(flags.quiet),
    noColor: Boolean(flags["no-color"]),
    apiBaseUrl: flags["api-base-url"] ?? process.env.WHETHER_API_URL ?? config.api_base_url ?? "http://localhost:3000",
    token: flags.token ?? envToken ?? config.token ?? null,
    tokenSource: typeof flags.token === "string" ? "flag" : envToken ? "env" : config.token ? "config" : "none",
    profile: process.env.WHETHER_PROFILE ?? config.profile ?? "default",
  };
};

const ensureParentDirectory = async (filePath) => {
  const absolutePath = path.resolve(String(filePath));
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  return absolutePath;
};

const writeTextFile = async (filePath, content) => {
  const absolutePath = await ensureParentDirectory(filePath);
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  await fs.writeFile(absolutePath, normalized, "utf8");
  return absolutePath;
};

const writeFileIfRequested = async (flags, payload, settings, fallbackFile = null) => {
  const outputFile = typeof flags.output === "string" ? flags.output : fallbackFile;
  if (!outputFile) return null;
  return writeTextFile(outputFile, serializePayload(payload, settings.output));
};

const resolveCompanyContext = (settings, flags = {}, overrides = {}) => {
  const company = overrides.company ?? (typeof flags.company === "string" ? flags.company : settings.config.default_company ?? null);
  const stage = overrides.stage ?? (typeof flags.stage === "string" ? flags.stage : settings.config.default_stage ?? null);
  if (!company && !stage) return null;
  return {
    company: company ?? null,
    stage: stage ?? null,
    mode: "local-profile-only",
    note: "Base weekly call unchanged.",
  };
};

const formatCompanyContextLine = (context) => {
  if (!context) return null;
  const parts = [];
  if (context.company) parts.push(context.company);
  if (context.stage) parts.push(`stage ${context.stage}`);
  if (parts.length === 0) return null;
  return `Company context: ${parts.join(" · ")} (local profile only; base weekly call unchanged)`;
};

const attachCompanyContextText = (text, context) => {
  const contextLine = formatCompanyContextLine(context);
  return contextLine ? `${contextLine}\n\n${text}` : text;
};

const attachCompanyContextPayload = (payload, context) => {
  if (!context || !payload || typeof payload !== "object") return payload;
  return { ...payload, context };
};

const briefTitleByVariant = {
  exec: "Exec brief",
  board: "Board brief",
  staff: "Staff brief",
  investor: "Investor brief",
  slack: "Slack brief",
  email: "Email brief",
};

const buildBriefArtifact = (variant, body) => {
  const resolvedVariant = briefTitleByVariant[variant] ? variant : "exec";
  const title = briefTitleByVariant[resolvedVariant];
  const recordDate = body.recordDate ?? "unknown";
  if (resolvedVariant === "email") {
    const subject = `Whether weekly brief — ${recordDate}`;
    const rendered = `Subject: ${subject}\n\n${body.brief}`;
    return {
      variant: resolvedVariant,
      title,
      subject,
      rendered,
      payload: {
        ...body,
        variant: resolvedVariant,
        title,
        subject,
        rendered,
      },
    };
  }

  const rendered = resolvedVariant === "slack" ? body.brief : `${title}\n\n${body.brief}`;
  return {
    variant: resolvedVariant,
    title,
    subject: null,
    rendered,
    payload: {
      ...body,
      variant: resolvedVariant,
      title,
      rendered,
    },
  };
};

const buildMarkdownExport = ({ status, changes, brief }) => {
  const lines = [
    "# Whether Export",
    "",
    "## Current Call",
    `- Regime: ${status.regime}`,
    `- Cycle phase: ${status.cyclePhase}`,
    `- Confidence: ${status.confidence.label} (${status.confidence.score})`,
    `- Trend: ${status.trend}`,
    `- Summary: ${status.call.summary}`,
    "",
    "## Do Now",
    ...status.call.do.map((item) => `- ${item}`),
    "",
    "## Avoid",
    ...status.call.avoid.map((item) => `- ${item}`),
    "",
    "## Flip Conditions",
    ...status.call.flipConditions.map((item) => `- ${item}`),
    "",
    "## What Changed",
    ...changes.changed.map((item) => `- ${item.metric}: ${item.from} -> ${item.to} (${item.direction}, ${item.impact})`),
    "",
    "## Revisit Now",
    ...changes.revisit.map((item) => `- ${item}`),
    "",
    "## Weekly Brief",
    brief,
  ];
  return lines.join("\n");
};

const buildTextBriefing = ({ status, changes, brief }) => {
  const lines = [
    "Whether briefing",
    "",
    `Regime: ${status.regime}`,
    `Cycle phase: ${status.cyclePhase}`,
    `Confidence: ${status.confidence.label} (${status.confidence.score})`,
    `Trend: ${status.trend}`,
    `Freshness: ${freshnessText(status)}`,
    "",
    `Call: ${status.call.summary}`,
    "",
    "Do now:",
    ...status.call.do.map((item) => `- ${item}`),
    "",
    "Avoid:",
    ...status.call.avoid.map((item) => `- ${item}`),
    "",
    "Flip conditions:",
    ...status.call.flipConditions.map((item) => `- ${item}`),
    "",
    "What changed:",
    ...changes.changed.map((item) => `- ${item.metric}: ${item.from} -> ${item.to} (${item.direction}, ${item.impact})`),
    "",
    "Revisit:",
    ...changes.revisit.map((item) => `- ${item}`),
    "",
    "Weekly brief:",
    brief,
  ];
  return lines.join("\n");
};

const wrapText = (text, font, fontSize, maxWidth, prefix = "", continuationPrefix = prefix) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [prefix.trimEnd()];
  }

  const lines = [];
  let current = prefix;
  for (const word of words) {
    const candidate = `${current}${current.trim().length === 0 ? "" : " "}${word}`;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current.trimEnd());
    current = `${continuationPrefix}${word}`;
  }
  lines.push(current.trimEnd());
  return lines;
};

const sanitizePdfText = (value) =>
  String(value)
    .replace(/•/g, "-")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/→/g, "->")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/’/g, "'")
    .replace(/“|”/g, "\"");

const createPdfFromText = async (title, content, outputFile) => {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageSize = [612, 792];
  const margin = 54;
  const footerGap = 28;
  const defaultLineHeight = 15;
  const smallGap = 8;
  const mediumGap = 14;

  let page = pdfDoc.addPage(pageSize);
  let currentPageNumber = 1;
  let cursorY = pageSize[1] - margin;

  const drawFooter = () => {
    page.drawText(`Whether CLI export · Page ${currentPageNumber}`, {
      x: margin,
      y: 22,
      size: 9,
      font: regularFont,
    });
  };

  const newPage = () => {
    drawFooter();
    currentPageNumber += 1;
    page = pdfDoc.addPage(pageSize);
    cursorY = pageSize[1] - margin;
  };

  const ensureSpace = (requiredHeight) => {
    if (cursorY - requiredHeight < margin + footerGap) {
      newPage();
    }
  };

  const drawWrappedLine = (text, options = {}) => {
    const font = options.font ?? regularFont;
    const fontSize = options.fontSize ?? 11;
    const lineHeight = options.lineHeight ?? defaultLineHeight;
    const prefix = options.prefix ?? "";
    const continuationPrefix = options.continuationPrefix ?? prefix;
    const lines = wrapText(text, font, fontSize, pageSize[0] - margin * 2, prefix, continuationPrefix);
    ensureSpace(lines.length * lineHeight);
    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y: cursorY,
        size: fontSize,
        font,
      });
      cursorY -= lineHeight;
    }
  };

  drawWrappedLine(sanitizePdfText(title), { font: boldFont, fontSize: 18, lineHeight: 24 });
  cursorY -= smallGap;

  for (const rawLine of content.split("\n")) {
    const line = sanitizePdfText(rawLine);
    if (!line.trim()) {
      cursorY -= smallGap;
      continue;
    }
    if (line.endsWith(":")) {
      drawWrappedLine(line, { font: boldFont, fontSize: 11, lineHeight: defaultLineHeight });
      continue;
    }
    if (line.startsWith("- ")) {
      drawWrappedLine(line.slice(2), {
        font: regularFont,
        fontSize: 11,
        lineHeight: defaultLineHeight,
        prefix: "- ",
        continuationPrefix: "  ",
      });
      continue;
    }
    drawWrappedLine(line, { font: regularFont, fontSize: 11, lineHeight: defaultLineHeight });
  }

  drawFooter();
  const absolutePath = await ensureParentDirectory(outputFile);
  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(absolutePath, Buffer.from(pdfBytes));
  return absolutePath;
};

const copyTextToClipboard = (text) => {
  const explicitCommand = process.env.WHETHER_CLIPBOARD_COMMAND ? [process.env.WHETHER_CLIPBOARD_COMMAND] : null;
  const platformCommands =
    process.platform === "darwin"
      ? [["pbcopy"]]
      : process.platform === "win32"
        ? [["clip"]]
        : [["wl-copy"], ["xclip", "-selection", "clipboard"]];
  const candidates = explicitCommand ? [explicitCommand] : platformCommands;

  for (const [command, ...args] of candidates) {
    const result = spawnSync(command, args, { input: text, encoding: "utf8" });
    if (!result.error && result.status === 0) {
      return { copied: true, command };
    }
  }

  return { copied: false, command: null };
};

const inferShell = (requestedShell) => {
  if (typeof requestedShell === "string" && requestedShell.trim()) {
    return path.basename(requestedShell.trim());
  }
  if (typeof process.env.SHELL === "string" && process.env.SHELL.trim()) {
    return path.basename(process.env.SHELL.trim());
  }
  return "bash";
};

const renderBashCompletion = () => `# whether bash completion
_whether_completion() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local commands="ping status call changes regime diagnostics history brief export share explain scenario company watch config install auth raw doctor completion version"
  local global_flags="--help --version --json --yaml --markdown --quiet --no-color --api-base-url --token --output --company --stage"
  local subcommands=""

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${commands} \${global_flags}" -- "\${cur}") )
    return 0
  fi

  case "\${COMP_WORDS[1]}" in
    call) subcommands="show copy diff" ;;
    diagnostics) subcommands="summary drivers evidence provenance" ;;
    history) subcommands="compare" ;;
    brief) subcommands="exec board staff investor slack email" ;;
    export) subcommands="json csv markdown pdf briefing" ;;
    share) subcommands="slack email clipboard" ;;
    explain) subcommands="regime call flip metric" ;;
    company) subcommands="list select status call brief" ;;
    config) subcommands="init get set" ;;
    auth) subcommands="login logout status" ;;
  esac

  COMPREPLY=( $(compgen -W "\${subcommands} \${global_flags}" -- "\${cur}") )
}

complete -F _whether_completion whether
`;

const renderZshCompletion = () => `#compdef whether
_whether_completion() {
  local -a commands global_flags subcommands
  commands=(ping status call changes regime diagnostics history brief export share explain scenario company watch config install auth raw doctor completion version)
  global_flags=(--help --version --json --yaml --markdown --quiet --no-color --api-base-url --token --output --company --stage)

  if (( CURRENT == 2 )); then
    compadd -- $commands $global_flags
    return
  fi

  case $words[2] in
    call) subcommands=(show copy diff) ;;
    diagnostics) subcommands=(summary drivers evidence provenance) ;;
    history) subcommands=(compare) ;;
    brief) subcommands=(exec board staff investor slack email) ;;
    export) subcommands=(json csv markdown pdf briefing) ;;
    share) subcommands=(slack email clipboard) ;;
    explain) subcommands=(regime call flip metric) ;;
    company) subcommands=(list select status call brief) ;;
    config) subcommands=(init get set) ;;
    auth) subcommands=(login logout status) ;;
    *) subcommands=() ;;
  esac

  compadd -- $subcommands $global_flags
}

compdef _whether_completion whether
`;

const classifyAuthFailure = (responseBody) => {
  const rawCode = responseBody?.code ?? responseBody?.errorCode ?? responseBody?.error ?? responseBody?.reason;
  const code = typeof rawCode === "string" ? rawCode.toLowerCase() : "";
  if (code.includes("expired")) return AUTH_FAILURE.EXPIRED;
  if (code.includes("scope") || code.includes("forbidden")) return AUTH_FAILURE.SCOPE;
  if (code.includes("missing") || code.includes("no_token") || code.includes("unauthorized")) return AUTH_FAILURE.MISSING;
  if (code.includes("invalid") || code.includes("malformed")) return AUTH_FAILURE.INVALID;
  return AUTH_FAILURE.INVALID;
};

const getCategoryRemediation = (category, settings, detail) => {
  const healthUrl = `${settings.apiBaseUrl}/api/health`;
  switch (category) {
    case ERROR_CATEGORY.AUTH:
      if (detail === AUTH_FAILURE.MISSING) {
        return "Set WHETHER_API_KEY (or WHETHER_TOKEN) or pass --token, then run `whether auth login --token <token>`.";
      }
      if (detail === AUTH_FAILURE.EXPIRED) {
        return "Token expired. Rotate WHETHER_API_KEY (or WHETHER_TOKEN), then rerun `whether auth login --token <token>`.";
      }
      if (detail === AUTH_FAILURE.SCOPE) {
        return "Token is valid but lacks required scope. Mint a key with CLI scope, export WHETHER_API_KEY, then retry.";
      }
      return "Token is invalid. Replace WHETHER_API_KEY (or WHETHER_TOKEN) and rerun `whether auth login --token <token>`.";
    case ERROR_CATEGORY.NETWORK:
      return `Set WHETHER_API_URL or pass --api-base-url, then verify ${healthUrl}.`;
    case ERROR_CATEGORY.FORBIDDEN:
      return "Use a token with required access via WHETHER_API_KEY (or WHETHER_TOKEN) or --token, then retry.";
    case ERROR_CATEGORY.RATE_LIMIT:
      return "Retry with --watch --interval 120 or wait for quota reset at /api/cli/status.";
    case ERROR_CATEGORY.SERVER_FAULT:
      return `Run \`whether doctor\` and verify ${healthUrl} is healthy before retrying.`;
    default:
      return "Retry the command or run `whether doctor`.";
  }
};

const buildCliError = ({ category, summary, settings, cause, exitCode = EXIT.ERROR, detail = null }) => {
  const remediation = getCategoryRemediation(category, settings, detail);
  const error = new Error(`${category}: ${summary} ${remediation}`, { cause });
  error.exitCode = exitCode;
  error.category = category;
  error.remediation = remediation;
  error.detail = detail;
  return error;
};

const buildHttpStatusError = ({ status, ok, endpoint, settings, body = null }) => {
  const authDetail = classifyAuthFailure(body);
  if (status === 401) {
    return buildCliError({
      category: ERROR_CATEGORY.AUTH,
      summary:
        authDetail === AUTH_FAILURE.EXPIRED
          ? "Authentication failed (expired key)."
          : authDetail === AUTH_FAILURE.MISSING
            ? "Authentication failed (missing key)."
            : "Authentication failed (invalid key).",
      settings,
      cause: new Error(`HTTP ${status} for ${endpoint}`),
      exitCode: EXIT.AUTH_CONFIG,
      detail: authDetail,
    });
  }
  if (status === 403) {
    return buildCliError({
      category: ERROR_CATEGORY.FORBIDDEN,
      summary: "Access denied by API (invalid scope).",
      settings,
      cause: new Error(`HTTP ${status} for ${endpoint}`),
      exitCode: EXIT.AUTH_CONFIG,
    });
  }
  if (status === 429) {
    return buildCliError({
      category: ERROR_CATEGORY.RATE_LIMIT,
      summary: "Request quota exceeded.",
      settings,
      cause: new Error(`HTTP ${status} for ${endpoint}`),
      exitCode: EXIT.SERVER,
    });
  }
  if (status >= 500) {
    return buildCliError({
      category: ERROR_CATEGORY.SERVER_FAULT,
      summary: `API returned ${status}.`,
      settings,
      cause: new Error(`HTTP ${status} for ${endpoint}`),
      exitCode: EXIT.SERVER,
    });
  }
  if (status === 404) {
    const error = new Error("No data available.");
    error.exitCode = EXIT.NO_DATA;
    return error;
  }
  if (!ok) {
    const error = new Error(`Request failed (${status})`, {
      cause: new Error(`HTTP ${status} for ${endpoint}`),
    });
    error.exitCode = EXIT.ERROR;
    return error;
  }
  return null;
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
      exitCode: EXIT.NETWORK,
    });
  }

  let parsedBody = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      // By cloning the response, we can safely inspect the body for error
      // classification without consuming the stream for the final return.
      parsedBody = await response.clone().json();
    } catch {
      // Ignore if body is not valid JSON. The final `response.json()` will handle it.
      parsedBody = null;
    }
  }

  const statusError = buildHttpStatusError({ status: response.status, ok: response.ok, body: parsedBody, endpoint, settings });
  if (statusError) throw statusError;

  // The original response body is still available due to clone(), so this is safe.
  return response.json();
};

const cmdVersion = async (settings) => {
  const version = await readCliVersion();
  const payload = { name: "whether", version };
  writeOutput(settings.output === "text" ? version : payload, settings);
};

const cmdPing = async (settings, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.ping, settings);
  const endpoint = "/api/health";
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
      exitCode: EXIT.NETWORK,
    });
  }

  let parsedBody = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      parsedBody = await response.json();
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok && response.status === 503 && parsedBody?.status === "degraded") {
    const payload = {
      ok: true,
      apiBaseUrl: settings.apiBaseUrl,
      status: "degraded",
      degraded: true,
    };
    writeOutput(settings.output === "text" ? "degraded" : payload, settings);
    return;
  }

  const statusError = buildHttpStatusError({ status: response.status, ok: response.ok, body: parsedBody, endpoint, settings });
  if (statusError) throw statusError;
  const health = parsedBody ?? (await response.json());
  const payload = {
    ok: true,
    apiBaseUrl: settings.apiBaseUrl,
    status: health.status ?? "ok",
    degraded: health.status === "degraded",
  };
  writeOutput(settings.output === "text" ? "ok" : payload, settings);
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
const diagnosticsText = (body) => `Diagnostics

Top drivers:
${body.topDrivers.map((item, idx) => `${idx + 1}. ${item.title} — ${item.directionLabel}\n   ${item.immediateImplication}`).join("\n")}`;
const scenarioText = (body) => {
  const from = body.likelyOutcome?.from ?? body.postureBefore ?? "unknown";
  const to = body.likelyOutcome?.to ?? body.postureAfter ?? "unknown";
  const changed = typeof body.likelyOutcome?.changed === "boolean" ? body.likelyOutcome.changed : from !== to;
  return `Scenario

Inputs:
- Tightness: ${body.inputs.tightness}
- Risk appetite: ${body.inputs.riskAppetite}

Likely outcome:
- From: ${from}
- To: ${to}
- Changed: ${changed ? "yes" : "no"}

Implication:
${body.implication ?? "Review the implied posture shift before acting."}`;
};

const routeWithCommonParams = (base, flags, allowedFlags = ["as-of", "company", "stage", "weeks", "view"]) => {
  const keyMap = {
    "as-of": "asOf",
    company: "company",
    stage: "stage",
    weeks: "weeks",
    view: "view",
    tightness: "tightness",
    "risk-appetite": "risk-appetite",
  };
  const params = new URLSearchParams();
  for (const flag of allowedFlags) {
    const value = flags[flag];
    if (value === undefined || value === null || value === "") continue;
    params.set(keyMap[flag] ?? flag, String(value));
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
};

const cliRoutes = {
  status: (flags) => routeWithCommonParams("/api/cli/status", flags, ["as-of", "view"]),
  call: (flags) => routeWithCommonParams("/api/cli/call", flags, ["as-of"]),
  changes: (flags) => routeWithCommonParams("/api/cli/changes", flags, ["as-of"]),
  diagnostics: (flags) => routeWithCommonParams("/api/cli/diagnostics", flags, ["as-of"]),
  regime: (flags) => routeWithCommonParams("/api/cli/regime", flags, ["as-of"]),
  history: (flags) => routeWithCommonParams("/api/cli/history", flags, ["as-of", "weeks"]),
  scenario: (flags) => routeWithCommonParams("/api/cli/scenario", flags, ["tightness", "risk-appetite"]),
};

const cmdStatus = async (settings, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.status, settings);
  const route = cliRoutes.status({
    ...flags,
    view: flags.verbose || flags.view === "expanded" ? "expanded" : undefined,
  });
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
  const context = resolveCompanyContext(settings, flags);
  const rendered = attachCompanyContextText(flags.summary ? body.call.summary : `${statusText(body)}${expandedTail}`, context);
  const payload = attachCompanyContextPayload(body, context);
  await writeFileIfRequested(flags, settings.output === "text" ? rendered : payload, settings);
  writeOutput(settings.output === "text" ? rendered : payload, settings);
};

const cmdCall = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.call, settings);
  const body = await getJson(settings, cliRoutes.call(flags));

  if (subcommand === "diff") {
    const from = flags.from ?? "previous";
    const to = flags.to ?? "current";
    return writeOutput(`Call diff (${from} -> ${to})\n\nCurrent call:\n${body.call}`, settings);
  }

  const context = resolveCompanyContext(settings, flags);
  const rendered = attachCompanyContextText(callText(body), context);
  const payload = attachCompanyContextPayload(body, context);
  if (subcommand === "copy" || flags.copy) {
    return writeOutput(rendered, settings);
  }

  await writeFileIfRequested(flags, settings.output === "text" ? rendered : payload, settings);
  writeOutput(settings.output === "text" ? rendered : payload, settings);
};

const cmdRegime = async (settings, flags) => {
  const body = await getJson(settings, cliRoutes.regime(flags));
  const context = resolveCompanyContext(settings, flags);
  if (flags.plot) {
    const history = await getJson(settings, "/api/cli/history");
    const plot = history.history.map((item) => `${item.recordDate}  ${item.regime}  ${item.trend}`).join("\n");
    return writeOutput(attachCompanyContextText(`Regime history\n${plot}`, context), settings);
  }
  const text = attachCompanyContextText(`Regime: ${body.regime}\nPhase: ${body.phase}\nConfidence: ${body.confidence}\nTrend: ${body.trend}\n\nInterpretation:\n${body.interpretation}`, context);
  const payload = attachCompanyContextPayload(body, context);
  await writeFileIfRequested(flags, settings.output === "text" ? text : payload, settings);
  writeOutput(settings.output === "text" ? text : payload, settings);
};

const cmdChanges = async (settings, flags) => {
  const body = await getJson(settings, cliRoutes.changes(flags));
  const context = resolveCompanyContext(settings, flags);
  const text = attachCompanyContextText(changesText(body), context);
  const payload = attachCompanyContextPayload(body, context);
  await writeFileIfRequested(flags, settings.output === "text" ? text : payload, settings);
  writeOutput(settings.output === "text" ? text : payload, settings);
};

const cmdDiagnostics = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.diagnostics, settings);
  const body = await getJson(settings, cliRoutes.diagnostics(flags));
  const context = resolveCompanyContext(settings, flags);
  if (subcommand === "provenance") {
    const status = await getJson(settings, cliRoutes.status(flags));
    return writeOutput(attachCompanyContextPayload({ updatedAt: status.updatedAt, confidence: status.confidence, degraded: status.degraded }, context), settings);
  }
  if (subcommand === "evidence") {
    const metric = flags.metric ? String(flags.metric).toLowerCase() : null;
    const filtered = metric ? body.topDrivers.filter((driver) => driver.title.toLowerCase().includes(metric)) : body.topDrivers;
    const evidencePayload = attachCompanyContextPayload({ ...body, topDrivers: filtered }, context);
    const evidenceText = attachCompanyContextText(filtered.map((item, idx) => `${idx + 1}. ${item.title} (${item.directionLabel})`).join("\n"), context);
    return writeOutput(settings.output === "text" ? evidenceText : evidencePayload, settings);
  }
  const payload = attachCompanyContextPayload(body, context);
  const text = attachCompanyContextText(diagnosticsText(body), context);
  await writeFileIfRequested(flags, settings.output === "text" ? text : payload, settings);
  writeOutput(settings.output === "text" ? text : payload, settings);
};

const cmdHistory = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.history, settings);
  const body = await getJson(settings, cliRoutes.history(flags));
  const context = resolveCompanyContext(settings, flags);
  if (subcommand === "compare") {
    return writeOutput(
      attachCompanyContextText(
        `Compare mode (${flags.from ?? "start"} -> ${flags.to ?? "end"})
${body.history[0]?.recordDate ?? "n/a"} latest snapshot`,
        context,
      ),
      settings,
    );
  }
  const text = attachCompanyContextText(`Recent History (${body.windowWeeks}w, max ${body.maxWeeks})

${body.history.map((item) => `${item.recordDate}  ${item.regime}  ${item.confidenceLabel}  ${item.trend}`).join("\n")}`, context);
  const payload = attachCompanyContextPayload(body, context);
  await writeFileIfRequested(flags, settings.output === "text" ? text : payload, settings);
  writeOutput(settings.output === "text" ? text : payload, settings);
};


const cmdBrief = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.brief, settings);
  const variant = subcommand ?? "exec";
  const body = await getJson(settings, "/api/brief/slack");
  const context = resolveCompanyContext(settings, flags);
  const artifact = buildBriefArtifact(variant, body);
  const rendered = attachCompanyContextText(artifact.rendered, context);
  const payload = attachCompanyContextPayload(artifact.payload, context);
  await writeFileIfRequested(flags, settings.output === "text" ? rendered : payload, settings);
  writeOutput(settings.output === "text" ? rendered : payload, settings);
};

const cmdExport = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.export, settings);
  const format = subcommand ?? "json";
  const status = await getJson(settings, "/api/cli/status");
  const changes = await getJson(settings, "/api/cli/changes");
  const briefBody = await getJson(settings, "/api/brief/slack");
  const brief = buildBriefArtifact("exec", briefBody);
  const context = resolveCompanyContext(settings, flags);
  const payload = attachCompanyContextPayload({ status, changes, brief: brief.payload }, context);
  const markdown = attachCompanyContextText(buildMarkdownExport({ status, changes, brief: briefBody.brief }), context);
  const briefing = attachCompanyContextText(buildTextBriefing({ status, changes, brief: briefBody.brief }), context);

  if (format === "csv") {
    const csv = ["metric,from,to,direction,impact", ...changes.changed.map((item) => `${item.metric},${item.from},${item.to},${item.direction},${item.impact}`)].join("\n");
    await writeFileIfRequested(flags, csv, { ...settings, output: "text" });
    return writeOutput(csv, settings);
  }

  if (format === "markdown") {
    await writeFileIfRequested(flags, markdown, { ...settings, output: "text" });
    return writeOutput(markdown, settings);
  }

  if (format === "briefing") {
    await writeFileIfRequested(flags, briefing, { ...settings, output: "text" });
    return writeOutput(briefing, settings);
  }

  if (format === "pdf") {
    const outputPath = typeof flags.output === "string" ? flags.output : "whether-briefing.pdf";
    const absolutePath = await createPdfFromText("Whether briefing", briefing, outputPath);
    const result = { ok: true, format: "pdf", outputPath: absolutePath };
    return writeOutput(settings.output === "text" ? `Wrote PDF briefing to ${absolutePath}` : result, settings);
  }

  await writeFileIfRequested(flags, payload, { ...settings, output: "json" });
  writeOutput(settings.output === "text" ? JSON.stringify(payload, null, 2) : payload, settings);
};

const cmdShare = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.share, settings);
  const channel = subcommand ?? "clipboard";
  const briefType = flags.brief ?? "exec";
  const briefBody = await getJson(settings, "/api/brief/slack");
  const brief = buildBriefArtifact(briefType, briefBody);
  const context = resolveCompanyContext(settings, flags);
  const briefText = attachCompanyContextText(brief.rendered, context);

  if (channel === "clipboard") {
    const clipboard = copyTextToClipboard(briefText);
    const payload = attachCompanyContextPayload({
      channel,
      briefType,
      copied: clipboard.copied,
      command: clipboard.command,
      brief: briefText,
    }, context);
    if (clipboard.copied) {
      return writeOutput(settings.output === "text" ? `Copied ${brief.title.toLowerCase()} to clipboard.` : payload, settings);
    }
    await writeFileIfRequested(flags, briefText, { ...settings, output: "text" });
    return writeOutput(settings.output === "text" ? briefText : payload, settings);
  }

  if (channel === "slack") {
    const weeklyMandate = await getJson(settings, "/api/integrations/weekly-mandate?target=slack");
    const payload = attachCompanyContextPayload({
      channel,
      briefType,
      text: briefText,
      blocks: weeklyMandate.payload?.blocks ?? [],
      metadata: weeklyMandate.payload?.metadata ?? null,
      recordDate: briefBody.recordDate,
    }, context);
    await writeFileIfRequested(flags, settings.output === "text" ? briefText : payload, settings);
    return writeOutput(settings.output === "text" ? briefText : payload, settings);
  }

  const subject = brief.subject ?? `Whether weekly brief — ${briefBody.recordDate}`;
  const payload = attachCompanyContextPayload({
    channel: "email",
    briefType,
    subject,
    body: briefText,
    mailto: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(briefText)}`,
  }, context);
  const rendered = `Subject: ${subject}\n\n${briefText}`;
  await writeFileIfRequested(flags, settings.output === "text" ? rendered : payload, settings);
  writeOutput(settings.output === "text" ? rendered : payload, settings);
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
  const body = await getJson(settings, cliRoutes.scenario(flags));
  const context = resolveCompanyContext(settings, flags);
  const text = attachCompanyContextText(scenarioText(body), context);
  const payload = attachCompanyContextPayload(body, context);
  await writeFileIfRequested(flags, settings.output === "text" ? text : payload, settings);
  writeOutput(settings.output === "text" ? text : payload, settings);
};

const cmdCompany = async (settings, subcommand, args, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.company, settings);
  const savedContext = resolveCompanyContext(settings, {}, {});
  if (subcommand === "list") {
    if (!savedContext) {
      return writeOutput(
        settings.output === "text"
          ? "No company context saved. Use `whether company select <name> --stage <stage>`."
          : { saved: [], selected: null },
        settings,
      );
    }
    return writeOutput(
      settings.output === "text"
        ? `${formatCompanyContextLine(savedContext)}`
        : { saved: [savedContext], selected: savedContext },
      settings,
    );
  }
  if (subcommand === "select") {
    const config = await loadConfig();
    const company = args[0] ?? flags.company;
    const stage = typeof flags.stage === "string" ? flags.stage : config.default_stage ?? null;
    if (!company) process.exit(EXIT.AUTH_CONFIG);
    await saveConfig({ ...config, default_company: company, ...(stage ? { default_stage: stage } : {}) });
    return writeOutput(`Selected company context: ${company}${stage ? ` · stage ${stage}` : ""}`, settings);
  }
  const context = resolveCompanyContext(settings, flags, { company: args[0] ?? flags.company });
  if (!context) {
    return writeOutput("Provide a company name or select one first with `whether company select <name>`.", settings);
  }
  if (subcommand === null || subcommand === "status") return cmdStatus(settings, { ...flags, company: context.company, stage: context.stage });
  if (subcommand === "call") return cmdCall(settings, "show", { ...flags, company: context.company, stage: context.stage });
  if (subcommand === "brief") return cmdBrief(settings, "board", { ...flags, company: context.company, stage: context.stage });
  return writeOutput(formatCompanyContextLine(context), settings);
};

const cmdRaw = async (settings, subcommand) => {
  const endpoint = subcommand ?? "/api/cli/status";
  const body = await getJson(settings, endpoint.startsWith("/") ? endpoint : `/${endpoint}`);
  writeOutput(body, settings);
};

const cmdDoctor = async (settings) => {
  const checks = [];
  const endpoint = "/api/health";

  try {
    const response = await fetch(`${settings.apiBaseUrl}${endpoint}`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(settings.token ? { authorization: `Bearer ${settings.token}` } : {}),
      },
    });

    let parsedBody = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        parsedBody = await response.json();
      } catch {
        parsedBody = null;
      }
    }

    if (!response.ok && response.status === 503 && parsedBody?.status === "degraded") {
      checks.push({ name: "api/health", status: "warning", message: "API is reachable but degraded.", health: parsedBody.status });
    } else {
      const statusError = buildHttpStatusError({ status: response.status, ok: response.ok, body: parsedBody, endpoint, settings });
      if (statusError) throw statusError;
      checks.push({ name: "api/health", status: "ok", health: parsedBody?.status ?? "ok" });
    }
  } catch (error) {
    checks.push({ name: "api/health", status: "error", message: error.message });
  }

  const config = await loadConfig();
  checks.push({ name: "configPath", status: "ok", path: CONFIG_PATH, profile: config.profile ?? "default" });
  writeOutput(checks, settings);
};

const cmdCompletion = async (settings, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.completion, settings);
  const shell = inferShell(flags.shell);
  if (shell === "zsh") {
    return writeOutput(renderZshCompletion(), { ...settings, output: "text" });
  }
  return writeOutput(renderBashCompletion(), { ...settings, output: "text" });
};

const cmdInstall = async (settings, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.install, settings);

  const explicitNonInteractive = Boolean(flags.yes || flags.ci);
  if (!process.stdin.isTTY && !explicitNonInteractive) {
    throw new Error("Non-interactive shell detected. Re-run with `whether install --yes` (or `--ci`) to accept defaults.");
  }

  const config = await loadConfig();
  const installConfig = {
    profile: config.profile ?? settings.profile ?? "default",
    workspace: config.workspace ?? "default",
    timezone: config.timezone ?? "America/New_York",
    output: config.output ?? "text",
    api_base_url: settings.apiBaseUrl,
    ...(typeof flags.token === "string" ? { token: flags.token } : {}),
  };

  try {
    await saveConfig({ ...config, ...installConfig });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Install failed while writing ${CONFIG_PATH}. Check shell write permissions, then retry or set WHETHER_API_URL/WHETHER_TOKEN as env vars.`,
      { cause: new Error(message) },
    );
  }

  writeOutput(`Install complete. Configured ${CONFIG_PATH}`, settings);
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
    const token = flags.token ?? process.env.WHETHER_API_KEY ?? process.env.WHETHER_TOKEN;
    if (!token || typeof token !== "string") process.exit(EXIT.AUTH_CONFIG);
    await saveConfig({ ...config, token });
    return writeOutput("Token saved.", settings);
  }
  if (subcommand === "logout") {
    const { token: _token, ...rest } = config;
    await saveConfig(rest);
    return writeOutput("Logged out.", settings);
  }
  const effectiveToken = flags.token ?? process.env.WHETHER_API_KEY ?? process.env.WHETHER_TOKEN ?? config.token ?? null;
  const payload = {
    authenticated: Boolean(effectiveToken),
    source: settings.tokenSource,
    hasToken: Boolean(effectiveToken),
    apiBaseUrl: settings.apiBaseUrl,
  };

  if (!payload.authenticated) {
    writeOutput(settings.output === "text" ? "Not authenticated" : payload, settings);
    process.exit(EXIT.AUTH_CONFIG);
  }

  if (flags.check) {
    const endpoint = AUTH_CHECK_ENDPOINT;
    let response;
    try {
      response = await fetch(`${settings.apiBaseUrl}${endpoint}`, {
        cache: "no-store",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${effectiveToken}`,
        },
      });
    } catch (cause) {
      throw buildCliError({
        category: ERROR_CATEGORY.NETWORK,
        summary: "Unable to reach Whether API.",
        settings,
        cause,
        exitCode: EXIT.NETWORK,
      });
    }
    let responseBody = null;
    try {
      responseBody = await response.clone().json();
    } catch {
      responseBody = null;
    }
    const statusError = buildHttpStatusError({ status: response.status, ok: response.ok, endpoint, settings, body: responseBody });
    if (statusError) throw statusError;
  }

  writeOutput(settings.output === "text" ? "Authenticated" : payload, settings);
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

  if (parsed.flags.version) {
    const settings = await normalizeFlags(parsed.flags);
    await cmdVersion(settings);
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
      case "ping":
        await cmdPing(settings, parsed.flags);
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
      case "install":
        await cmdInstall(settings, parsed.flags);
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
        await cmdCompletion(settings, parsed.flags);
        return;
      case "--version":
      case "version":
        await cmdVersion(settings);
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

main()
  .then(() => {
    process.exit(0);
  });
