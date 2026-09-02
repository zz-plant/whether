#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Commander.js converts --kebab-flags to camelCase keys.
// This normalizes them back so the rest of the code can always read kebab-case.
const toKebabFlags = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
      value,
    ]),
  );
import { Command } from "commander";

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
const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DEFAULT_LOCAL_API_PORT_CANDIDATES = [3000, 3001, 3002, 3003, 3004, 3005, 8787];
const LOCAL_API_HOST_CANDIDATES = ["localhost", "127.0.0.1"];
const LOCAL_API_DISCOVERY_TIMEOUT_MS = 150;

const parseLocalApiPortCandidates = (rawValue) => {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return DEFAULT_LOCAL_API_PORT_CANDIDATES;
  }

  const parsed = Array.from(
    new Set(
      rawValue
        .split(/[,\s]+/)
        .map((token) => Number.parseInt(token, 10))
        .filter((value) => Number.isInteger(value) && value > 0 && value <= 65_535),
    ),
  );

  return parsed.length > 0 ? parsed : DEFAULT_LOCAL_API_PORT_CANDIDATES;
};

const RAW_LOCAL_API_PORT_CANDIDATES = process.env.WHETHER_LOCAL_API_PORT_CANDIDATES;
const HAS_CUSTOM_LOCAL_API_PORT_CANDIDATES =
  typeof RAW_LOCAL_API_PORT_CANDIDATES === "string" && RAW_LOCAL_API_PORT_CANDIDATES.trim().length > 0;
const LOCAL_API_PORT_CANDIDATES = parseLocalApiPortCandidates(RAW_LOCAL_API_PORT_CANDIDATES);


const SUB_HELP = {};
const SUPPORTED_AGENT_CADENCES = ["weekly", "monthly", "quarterly", "yearly"];

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
  const envApiBaseUrl = process.env.WHETHER_API_URL ?? null;
  const configApiBaseUrl = config.api_base_url ?? null;
  // Flags are already normalized to kebab-case by toKebabFlags in withSettings

  const apiBaseUrl =
    typeof flags["api-base-url"] === "string"
      ? flags["api-base-url"]
      : envApiBaseUrl
        ? envApiBaseUrl
        : configApiBaseUrl
          ? configApiBaseUrl
          : DEFAULT_API_BASE_URL;
  const apiBaseUrlSource =
    typeof flags["api-base-url"] === "string"
      ? "flag"
      : envApiBaseUrl
        ? "env"
        : configApiBaseUrl
          ? "config"
          : "default";
  return {
    config,
    output: flags.json ? "json" : flags.yaml ? "yaml" : flags.markdown ? "markdown" : flags.format ?? config.output ?? "text",
    quiet: Boolean(flags.quiet),
    noColor: Boolean(flags["no-color"]),
    apiBaseUrl,
    apiBaseUrlSource,
    allowLocalApiDiscovery:
      !flags["no-local-discovery"] &&
      (apiBaseUrlSource === "default" || (apiBaseUrlSource === "config" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(apiBaseUrl))),
    resolvedApiBaseUrl: null,
    autodiscoveredApiBaseUrl: false,
    token: flags.token ?? envToken ?? config.token ?? null,
    tokenSource: typeof flags.token === "string" ? "flag" : envToken ? "env" : config.token ? "config" : "none",
    profile: process.env.WHETHER_PROFILE ?? config.profile ?? "default",
  };
};

const isTextOutput = (settings) => settings.output === "text";

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
  // The PDF library costs ~56ms to evaluate — roughly half this CLI's startup — and
  // only `export --format pdf` ever needs it. Loading it here keeps that cost on the
  // one command that uses it instead of on every `status`, `ping`, or `call`.
  // @cantoo/pdf-lib is the maintained fork of pdf-lib (same API; upstream has been
  // unreleased since 2021).
  const { PDFDocument, StandardFonts } = await import("@cantoo/pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageSize = [612, 792];
  const margin = 54;
  const footerGap = 28;
  const defaultLineHeight = 15;
  const smallGap = 8;

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
  local global_flags="--help --version --json --yaml --markdown --quiet --no-color --no-local-discovery --api-base-url --token --output --company --stage --compact --payload-only --prompt-only --skills-only"
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
  global_flags=(--help --version --json --yaml --markdown --quiet --no-color --no-local-discovery --api-base-url --token --output --company --stage --compact --payload-only --prompt-only --skills-only)

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

const buildRequestHeaders = (settings) => ({
  accept: "application/json",
  ...(settings.token ? { authorization: `Bearer ${settings.token}` } : {}),
});

const parseJsonBody = async (response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
};

const isLocalApiUrl = (value) => {
  try {
    const parsed = new URL(String(value));
    return LOCAL_API_HOST_CANDIDATES.includes(parsed.hostname);
  } catch {
    return false;
  }
};

const buildLocalApiCandidateUrls = (currentApiBaseUrl) => {
  const candidates = [];
  const seen = new Set();
  const pushCandidate = (candidate) => {
    if (seen.has(candidate)) return;
    seen.add(candidate);
    candidates.push(candidate);
  };

  if (!HAS_CUSTOM_LOCAL_API_PORT_CANDIDATES && isLocalApiUrl(currentApiBaseUrl)) {
    try {
      const parsed = new URL(currentApiBaseUrl);
      pushCandidate(parsed.origin);
      for (const host of LOCAL_API_HOST_CANDIDATES) {
        pushCandidate(`${parsed.protocol}//${host}${parsed.port ? `:${parsed.port}` : ""}`);
      }
    } catch {
      // Ignore invalid configured URL and fall back to defaults below.
    }
  }

  for (const port of LOCAL_API_PORT_CANDIDATES) {
    for (const host of LOCAL_API_HOST_CANDIDATES) {
      pushCandidate(`http://${host}:${port}`);
    }
  }

  return candidates;
};

const discoverHealthyLocalApiBaseUrl = async (settings, endpoint = "/api/health") => {
  if (!settings.allowLocalApiDiscovery) return null;
  if (settings.autodiscoveredApiBaseUrl && settings.resolvedApiBaseUrl) {
    return settings.resolvedApiBaseUrl;
  }

  const candidates = buildLocalApiCandidateUrls(settings.apiBaseUrl);
  for (const candidate of candidates) {
    try {
      const response = await fetch(`${candidate}${endpoint}`, {
        cache: "no-store",
        headers: buildRequestHeaders(settings),
        signal: AbortSignal.timeout(LOCAL_API_DISCOVERY_TIMEOUT_MS),
      });
      const parsedBody = await parseJsonBody(response);
      if (response.ok || (response.status === 503 && parsedBody?.status === "degraded")) {
        settings.resolvedApiBaseUrl = candidate;
        settings.autodiscoveredApiBaseUrl = candidate !== settings.apiBaseUrl;
        return candidate;
      }
    } catch {
      // Keep scanning known local dev ports.
    }
  }

  return null;
};

const fetchApiResponse = async (settings, endpoint, options = {}) => {
  const allowAutoDiscovery = options.allowAutoDiscovery ?? true;
  if (allowAutoDiscovery && settings.allowLocalApiDiscovery && !settings.resolvedApiBaseUrl) {
    await discoverHealthyLocalApiBaseUrl(settings);
  }

  const primaryBaseUrl = settings.resolvedApiBaseUrl ?? settings.apiBaseUrl;

  try {
    const response = await fetch(`${primaryBaseUrl}${endpoint}`, {
      cache: "no-store",
      headers: buildRequestHeaders(settings),
    });
    settings.resolvedApiBaseUrl = primaryBaseUrl;
    settings.autodiscoveredApiBaseUrl = primaryBaseUrl !== settings.apiBaseUrl;
    return { response, baseUrl: primaryBaseUrl };
  } catch (cause) {
    if (allowAutoDiscovery) {
      const discoveredBaseUrl = await discoverHealthyLocalApiBaseUrl(settings);
      if (discoveredBaseUrl && discoveredBaseUrl !== primaryBaseUrl) {
        try {
          const response = await fetch(`${discoveredBaseUrl}${endpoint}`, {
            cache: "no-store",
            headers: buildRequestHeaders(settings),
          });
          settings.resolvedApiBaseUrl = discoveredBaseUrl;
          settings.autodiscoveredApiBaseUrl = true;
          return { response, baseUrl: discoveredBaseUrl };
        } catch {
          // Fall through to the original network error below.
        }
      }
    }

    throw buildCliError({
      category: ERROR_CATEGORY.NETWORK,
      summary: "Unable to reach Whether API.",
      settings,
      cause,
      exitCode: EXIT.NETWORK,
    });
  }
};


const getJson = async (settings, endpoint) => {
  const { response } = await fetchApiResponse(settings, endpoint);
  const parsedBody = await parseJsonBody(response);

  const statusError = buildHttpStatusError({ status: response.status, ok: response.ok, body: parsedBody, endpoint, settings });
  if (statusError) throw statusError;

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
  const { response, baseUrl } = await fetchApiResponse(settings, endpoint);
  const parsedBody = await parseJsonBody(response);

  if (!response.ok && response.status === 503 && parsedBody?.status === "degraded") {
    const payload = {
      ok: true,
      apiBaseUrl: baseUrl,
      status: "degraded",
      degraded: true,
      autodiscovered: settings.autodiscoveredApiBaseUrl,
    };
    writeOutput(settings.output === "text" ? "degraded" : payload, settings);
    return;
  }

  const statusError = buildHttpStatusError({ status: response.status, ok: response.ok, body: parsedBody, endpoint, settings });
  if (statusError) throw statusError;
  const health = parsedBody ?? (await response.json());
  const payload = {
    ok: true,
    apiBaseUrl: baseUrl,
    status: health.status ?? "ok",
    degraded: health.status === "degraded",
    autodiscovered: settings.autodiscoveredApiBaseUrl,
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

const compactStatusPayload = (body) => ({
  regime: body.regime,
  cyclePhase: body.cyclePhase,
  confidence: body.confidence,
  trend: body.trend,
  decision: body.call?.summary ?? null,
  topDoNow: body.call?.do?.slice(0, 3) ?? [],
  flipTrigger: body.call?.flipConditions?.[0] ?? null,
  freshness: freshnessText(body),
  updatedAt: body.updatedAt ?? null,
  degraded: Boolean(body.degraded),
});

const compactStatusText = (body) => `Status snapshot
${body.regime} · ${body.trend} · ${body.confidence.label} (${body.confidence.score})
Call: ${body.call.summary}
Top do now: ${(body.call.do ?? []).slice(0, 2).join(" | ") || "n/a"}
Flip: ${body.call.flipConditions?.[0] ?? "n/a"}
Freshness: ${freshnessText(body)}`;

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
const agentText = (body) => `Agent brief

Cadence: ${body.cadence}
Record date: ${body.recordDateLabel ?? "Unavailable"}
Generated at: ${body.generatedAt}
Summary hash: ${body.summaryHash ?? "n/a"}
Decision delta: ${body.agentHandoff?.payload?.decision_delta?.summary ?? body.decision_delta?.summary ?? "n/a"}
Flip watch: ${body.agentHandoff?.payload?.flip_watch?.flip_trigger ?? body.flip_watch?.flip_trigger ?? "n/a"}
Links:
- Self: ${body.links?.self ?? "n/a"}
- llms.txt: ${body.links?.llms ?? "n/a"}
- Discovery: ${body.links?.discovery ?? "n/a"}

Copy:
${body.copy ?? ""}

Agent prompt:
${body.agentHandoff?.prompt ?? ""}
`;

const compactAgentPayload = (body) => {
  const skills = body.agentHandoff?.payload?.skills ?? body.skills ?? [];
  return {
    cadence: body.cadence,
    recordDateLabel: body.recordDateLabel ?? body.summary?.recordDateLabel ?? null,
    generatedAt: body.generatedAt ?? null,
    summaryHash: body.summaryHash ?? null,
    summary: body.summary?.summary ?? body.copy ?? null,
    decisionDelta: body.agentHandoff?.payload?.decision_delta?.summary ?? body.decision_delta?.summary ?? null,
    flipWatch: body.agentHandoff?.payload?.flip_watch?.flip_trigger ?? body.flip_watch?.flip_trigger ?? null,
    skills: skills.map((skill) => ({
      id: skill.id,
      label: skill.label,
      purpose: skill.purpose,
      outputs: skill.outputs ?? [],
    })),
    links: body.links ?? {},
  };
};

const compactAgentText = (body) => {
  const compact = compactAgentPayload(body);
  return `Agent brief (compact)

Cadence: ${compact.cadence}
Record date: ${compact.recordDateLabel ?? "Unavailable"}
Summary hash: ${compact.summaryHash ?? "n/a"}
Decision delta: ${compact.decisionDelta ?? "n/a"}
Flip watch: ${compact.flipWatch ?? "n/a"}
Skills:
${compact.skills.map((skill) => `- ${skill.id}: ${skill.purpose}`).join("\n") || "- none"}`;
};

const selectAgentOutput = (body, flags, settings) => {
  if (flags["prompt-only"]) {
    return settings.output === "text"
      ? body.agentHandoff?.prompt ?? ""
      : {
          cadence: body.cadence,
          recordDateLabel: body.recordDateLabel ?? null,
          generatedAt: body.generatedAt ?? null,
          summaryHash: body.summaryHash ?? null,
          prompt: body.agentHandoff?.prompt ?? null,
        };
  }

  if (flags["payload-only"]) {
    return settings.output === "text"
      ? JSON.stringify(body.agentHandoff?.payload ?? {}, null, 2)
      : (body.agentHandoff?.payload ?? {});
  }

  if (flags["skills-only"]) {
    const skills = body.agentHandoff?.payload?.skills ?? body.skills ?? [];
    return settings.output === "text"
      ? skills.map((skill) => `${skill.id}: ${skill.purpose}`).join("\n")
      : skills;
  }

  if (flags.compact) {
    return settings.output === "text" ? compactAgentText(body) : compactAgentPayload(body);
  }

  return settings.output === "text" ? agentText(body) : body;
};

const resolveAgentCadence = (subcommand, flags) => {
  const candidate = typeof flags.cadence === "string" ? flags.cadence : subcommand ?? "weekly";
  if (!SUPPORTED_AGENT_CADENCES.includes(candidate)) {
    const error = new Error(`Invalid cadence "${candidate}". Expected one of: ${SUPPORTED_AGENT_CADENCES.join(", ")}.`);
    error.exitCode = EXIT.ERROR;
    throw error;
  }
  return candidate;
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
  const compact = flags.compact ? (isTextOutput(settings) ? compactStatusText(body) : compactStatusPayload(body)) : null;
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
  const baseRendered = compact ?? (flags.summary ? body.call.summary : `${statusText(body)}${expandedTail}`);
  const rendered = attachCompanyContextText(baseRendered, context);
  const payload = compact ?? body;
  await writeFileIfRequested(flags, isTextOutput(settings) ? rendered : payload, settings);
  writeOutput(isTextOutput(settings) ? rendered : payload, settings);
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
  if (subcommand === "copy" || flags.copy) {
    return writeOutput(rendered, settings);
  }

  await writeFileIfRequested(flags, isTextOutput(settings) ? rendered : body, settings);
  writeOutput(isTextOutput(settings) ? rendered : body, settings);
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
  await writeFileIfRequested(flags, isTextOutput(settings) ? text : body, settings);
  writeOutput(isTextOutput(settings) ? text : body, settings);
};

const cmdChanges = async (settings, flags) => {
  const body = await getJson(settings, cliRoutes.changes(flags));
  const context = resolveCompanyContext(settings, flags);
  const text = attachCompanyContextText(changesText(body), context);
  await writeFileIfRequested(flags, isTextOutput(settings) ? text : body, settings);
  writeOutput(isTextOutput(settings) ? text : body, settings);
};

const cmdDiagnostics = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.diagnostics, settings);
  const body = await getJson(settings, cliRoutes.diagnostics(flags));
  const context = resolveCompanyContext(settings, flags);
  if (subcommand === "provenance") {
    const status = await getJson(settings, cliRoutes.status(flags));
    const payload = { updatedAt: status.updatedAt, confidence: status.confidence, degraded: status.degraded };
    const text = attachCompanyContextText(
      `Updated at: ${status.updatedAt ?? "n/a"}\nConfidence: ${status.confidence?.label ?? "n/a"}\nDegraded: ${status.degraded ? "yes" : "no"}`,
      context,
    );
    return writeOutput(isTextOutput(settings) ? text : payload, settings);
  }
  if (subcommand === "evidence") {
    const metric = flags.metric ? String(flags.metric).toLowerCase() : null;
    const filtered = metric ? body.topDrivers.filter((driver) => driver.title.toLowerCase().includes(metric)) : body.topDrivers;
    const evidencePayload = { ...body, topDrivers: filtered };
    const evidenceText = attachCompanyContextText(filtered.map((item, idx) => `${idx + 1}. ${item.title} (${item.directionLabel})`).join("\n"), context);
    return writeOutput(isTextOutput(settings) ? evidenceText : evidencePayload, settings);
  }
  const text = attachCompanyContextText(diagnosticsText(body), context);
  await writeFileIfRequested(flags, isTextOutput(settings) ? text : body, settings);
  writeOutput(isTextOutput(settings) ? text : body, settings);
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
  await writeFileIfRequested(flags, isTextOutput(settings) ? text : body, settings);
  writeOutput(isTextOutput(settings) ? text : body, settings);
};


const cmdBrief = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.brief, settings);
  const variant = subcommand ?? "exec";
  const body = await getJson(settings, "/api/brief/slack");
  const context = resolveCompanyContext(settings, flags);
  const artifact = buildBriefArtifact(variant, body);
  const rendered = attachCompanyContextText(artifact.rendered, context);
  await writeFileIfRequested(flags, isTextOutput(settings) ? rendered : body, settings);
  writeOutput(isTextOutput(settings) ? rendered : body, settings);
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
  await writeFileIfRequested(flags, isTextOutput(settings) ? text : body, settings);
  writeOutput(isTextOutput(settings) ? text : body, settings);
};

const cmdAgent = async (settings, subcommand, flags) => {
  if (flags.help) return writeOutput(SUB_HELP.agent, settings);
  const cadence = resolveAgentCadence(subcommand, flags);
  const body = await getJson(settings, `/api/agent?cadence=${cadence}`);
  const output = selectAgentOutput(body, flags, settings);
  await writeFileIfRequested(flags, output, settings);
  writeOutput(output, settings);
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
    const { response, baseUrl } = await fetchApiResponse(settings, endpoint);
    const parsedBody = await parseJsonBody(response);
    if (!response.ok && response.status === 503 && parsedBody?.status === "degraded") {
      checks.push({
        name: "api/health",
        status: "warning",
        message: "API is reachable but degraded.",
        health: parsedBody.status,
        apiBaseUrl: baseUrl,
        autodiscovered: settings.autodiscoveredApiBaseUrl,
      });
    } else {
      const statusError = buildHttpStatusError({ status: response.status, ok: response.ok, body: parsedBody, endpoint, settings });
      if (statusError) throw statusError;
      checks.push({
        name: "api/health",
        status: settings.autodiscoveredApiBaseUrl ? "warning" : "ok",
        health: parsedBody?.status ?? "ok",
        apiBaseUrl: baseUrl,
        message: settings.autodiscoveredApiBaseUrl
          ? `Configured ${settings.apiBaseUrl} was unavailable; using detected local API at ${baseUrl}.`
          : undefined,
        autodiscovered: settings.autodiscoveredApiBaseUrl,
      });
    }
  } catch (error) {
    checks.push({ name: "api/health", status: "error", message: error.message });
  }

  const config = await loadConfig();
  checks.push({
    name: "apiBaseUrl",
    status: "ok",
    configured: settings.apiBaseUrl,
    resolved: settings.resolvedApiBaseUrl ?? settings.apiBaseUrl,
    source: settings.apiBaseUrlSource,
    autodiscovered: settings.autodiscoveredApiBaseUrl,
  });
  checks.push({
    name: "auth",
    status: settings.token ? "ok" : "warning",
    authenticated: Boolean(settings.token),
    source: settings.tokenSource,
  });
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

const run = async () => {
  const version = await readCliVersion();
  const program = new Command();

  program
    .name("whether")
    .version(version)
    .description("Whether CLI — decision terminal for operators")
    .allowExcessArguments(false)
    .option("--json", "JSON output")
    .option("--yaml", "YAML output")
    .option("--markdown", "Markdown output")
    .option("--quiet", "Suppress output")
    .option("--no-color", "Disable color")
    .option("--no-local-discovery", "Skip local API discovery")
    .option("--api-base-url <url>", "API base URL")
    .option("--token <token>", "Auth token")
    .option("--output <format>", "Output format")
    .option("--company <name>", "Company context")
    .option("--stage <stage>", "Company stage")
    .option("--compact", "Compact output")
    .option("--payload-only", "Agent payload only")
    .option("--prompt-only", "Agent prompt only")
    .option("--skills-only", "Agent skills only")
    .option("--as-of <date>", "Historical date (YYYY-MM)")
    .option("--verbose", "Expanded view (alias for --view expanded)")
    .option("--view <mode>", "View mode")
    .option("--weeks <n>", "Number of weeks")
    .option("--tightness <n>", "Tightness override")
    .option("--risk-appetite <n>", "Risk appetite override")
    .option("--shell <shell>", "Shell for completion")
    .option("--yes", "Non-interactive install")
    .option("--ci", "CI mode install")
    .option("--check", "Auth check")
    .option("--interval <sec>", "Watch interval (seconds)")
    .option("--changes-only", "Watch changes only")
    .option("--copy", "Copy to clipboard")
    .option("--from <ref>", "Comparison start")
    .option("--to <ref>", "Comparison end")
    .option("--metric <key>", "Filter by metric")
    .option("--plot", "Plot regime history")
    .option("--cadence <cadence>", "Agent cadence override");

  const withSettings = (action) => async (...args) => {
    const opts = args.at(-1);
    const flags = toKebabFlags(
      Object.fromEntries(
        Object.entries({ ...program.opts(), ...opts }).filter(([, v]) => v !== undefined),
      ),
    );
    const settings = await normalizeFlags(flags);
    return action(settings, flags, ...args.slice(0, -1));
  };

  program
    .command("ping", { isDefault: false })
    .description("Verify API reachability and auth readiness")
    .action(withSettings(async (settings, flags) => cmdPing(settings, flags)));

  program
    .command("status", { isDefault: true })
    .description("Show current operating environment and call")
    .action(withSettings(async (settings, flags) => cmdStatus(settings, flags)));

  program
    .command("agent")
    .description("Pull the canonical agent handoff payload")
    .argument("[cadence]", "Cadence (weekly/monthly/quarterly/yearly)")
    .action(withSettings(async (settings, flags, cadence) => cmdAgent(settings, cadence, flags)));

  program
    .command("call")
    .description("Show leadership recommendation")
    .argument("[subcommand]", "Subcommand (show/copy/diff)")
    .action(withSettings(async (settings, flags, subcommand) => cmdCall(settings, subcommand ?? "show", flags)));

  program
    .command("regime")
    .description("Show regime and confidence")
    .action(withSettings(async (settings, flags) => cmdRegime(settings, flags)));

  program
    .command("changes")
    .description("Show what changed since last refresh")
    .action(withSettings(async (settings, flags) => cmdChanges(settings, flags)));

  program
    .command("diagnostics")
    .description("Show supporting drivers and evidence")
    .argument("[subcommand]", "Subcommand (summary/drivers/evidence/provenance)")
    .action(withSettings(async (settings, flags, subcommand) => cmdDiagnostics(settings, subcommand ?? "summary", flags)));

  program
    .command("history")
    .description("Show historical regimes and calls")
    .argument("[subcommand]", "Subcommand (compare)")
    .action(withSettings(async (settings, flags, subcommand) => cmdHistory(settings, subcommand, flags)));

  program
    .command("brief")
    .description("Generate formatted briefing output")
    .argument("[variant]", "Brief variant (exec/board/staff/investor/slack/email)")
    .action(withSettings(async (settings, flags, variant) => cmdBrief(settings, variant, flags)));

  program
    .command("export")
    .description("Export reports and machine-readable outputs")
    .argument("[format]", "Export format (json/csv/markdown/pdf/briefing)")
    .action(withSettings(async (settings, flags, format) => cmdExport(settings, format, flags)));

  program
    .command("share")
    .description("Share to configured channels")
    .argument("[channel]", "Share channel (slack/email/clipboard)")
    .action(withSettings(async (settings, flags, channel) => cmdShare(settings, channel, flags)));

  program
    .command("explain")
    .description("Explain the current regime or call")
    .argument("[subcommand]", "Subcommand (regime/call/flip/metric)")
    .action(withSettings(async (settings, flags, subcommand) => cmdExplain(settings, subcommand, flags)));

  program
    .command("scenario")
    .description("Run what-if analysis")
    .action(withSettings(async (settings, flags) => cmdScenario(settings, flags)));

  program
    .command("company")
    .description("Manage company contexts")
    .argument("[subcommand]", "Subcommand (list/select/status/call/brief)")
    .argument("[name]", "Company name")
    .action(withSettings(async (settings, flags, subcommand, name) => cmdCompany(settings, subcommand ?? "status", name ? [name] : [], flags)));

  program
    .command("watch")
    .description("Live refresh mode")
    .action(withSettings(async (settings, flags) => cmdWatch(settings, flags)));

  program
    .command("config")
    .description("Manage local configuration")
    .argument("[subcommand]", "Subcommand (init/get/set)")
    .argument("[key]", "Config key")
    .argument("[value]", "Config value")
    .action(withSettings(async (settings, flags, subcommand, key, value) => {
      const args = [key, value].filter(Boolean);
      await cmdConfig(settings, subcommand ?? "get", args, flags);
    }));

  program
    .command("install")
    .description("Bootstrap local CLI configuration")
    .action(withSettings(async (settings, flags) => cmdInstall(settings, flags)));

  program
    .command("auth")
    .description("Login and token management")
    .argument("[subcommand]", "Subcommand (login/logout/status)")
    .action(withSettings(async (settings, flags, subcommand) => cmdAuth(settings, subcommand ?? "status", flags)));

  program
    .command("raw")
    .description("Raw API request")
    .argument("[endpoint]", "API endpoint path")
    .action(withSettings(async (settings, _flags, endpoint) => cmdRaw(settings, endpoint)));

  program
    .command("doctor")
    .description("Diagnose CLI or API setup")
    .action(withSettings(async (settings) => cmdDoctor(settings)));

  program
    .command("completion")
    .description("Print shell completion script")
    .action(withSettings(async (settings, flags) => cmdCompletion(settings, flags)));

  program
    .command("version")
    .description("Print CLI version")
    .action(withSettings(async (settings) => cmdVersion(settings)));

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const knownError = error instanceof Error ? error : new Error(String(error));
    console.error(knownError.message);
    if (knownError.cause instanceof Error && knownError.cause.message) {
      console.error(`Cause: ${knownError.cause.message}`);
    }
    process.exit(knownError.exitCode ?? EXIT.ERROR);
  }
};

run().catch((error) => {
  const knownError = error instanceof Error ? error : new Error(String(error));
  console.error(knownError.message);
  if (knownError.cause instanceof Error && knownError.cause.message) {
    console.error(`Cause: ${knownError.cause.message}`);
  }
  process.exit(knownError.exitCode ?? EXIT.ERROR);
});
