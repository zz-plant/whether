import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const readLines = (filePath) =>
  readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const parseArgs = (argv) => {
  const options = {
    log: "",
    metricsOut: "",
    summaryOut: "",
    expected: "",
    critical: "",
    failOnNew: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--fail-on-new") {
      options.failOnNew = true;
      continue;
    }

    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }

    if (argument === "--log") {
      options.log = nextValue;
      index += 1;
      continue;
    }

    if (argument === "--metrics-out") {
      options.metricsOut = nextValue;
      index += 1;
      continue;
    }

    if (argument === "--summary-out") {
      options.summaryOut = nextValue;
      index += 1;
      continue;
    }

    if (argument === "--expected") {
      options.expected = nextValue;
      index += 1;
      continue;
    }

    if (argument === "--critical") {
      options.critical = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!options.log) {
    throw new Error("--log is required");
  }

  return options;
};

const ensureParentDirectory = (filePath) => {
  const parent = dirname(filePath);
  if (parent && parent !== ".") {
    mkdirSync(parent, { recursive: true });
  }
};

const warningPattern = /warn(?:ing)?(?:\s*[-:\]])?\s*(.+)$/i;
const invalidPrerenderPattern = /Invalid prerender config for .+/i;
const edgeRuntimePattern = /Using edge runtime on a page currently disables static generation for that page/i;

const normalizeWarningMessage = (value) =>
  value
    .replace(/^[!:\-\]\[]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

const collectWarnings = (logContents) => {
  const warningCounts = new Map();

  for (const line of logContents.split(/\r?\n/)) {
    const isWarningLine = /\bwarn(?:ing)?\b/i.test(line);
    const invalidPrerenderMatch = line.match(invalidPrerenderPattern);
    const edgeRuntimeMatch = line.match(edgeRuntimePattern);

    if (!isWarningLine && !invalidPrerenderMatch && !edgeRuntimeMatch) {
      continue;
    }

    const warningMatch = isWarningLine ? line.match(warningPattern) : null;
    const rawWarningMessage = isWarningLine
      ? warningMatch?.[1] ?? line
      : invalidPrerenderMatch?.[0] ?? edgeRuntimeMatch?.[0] ?? line;
    const warningMessage = normalizeWarningMessage(rawWarningMessage);

    if (!warningMessage) {
      continue;
    }

    warningCounts.set(warningMessage, (warningCounts.get(warningMessage) ?? 0) + 1);
  }

  return [...warningCounts.entries()]
    .map(([message, count]) => ({ message, count }))
    .sort((left, right) => right.count - left.count || left.message.localeCompare(right.message));
};

const renderSummary = ({ warnings, unexpectedWarnings, criticalHits, totalWarnings }) => {
  const uniqueCount = warnings.length;
  const warningRows = warnings.map(({ message, count }) => `| ${count} | ${message} |`).join("\n") || "| 0 | No warnings found |";
  const unexpectedRows =
    unexpectedWarnings.map(({ message, count }) => `| ${count} | ${message} |`).join("\n") ||
    "| 0 | None |";
  const criticalRows =
    criticalHits.map(({ message, count }) => `| ${count} | ${message} |`).join("\n") || "| 0 | None |";

  return [
    "# Cloudflare warning audit",
    "",
    `- Total warning lines: **${totalWarnings}**`,
    `- Unique warning classes: **${uniqueCount}**`,
    `- Unexpected warning classes: **${unexpectedWarnings.length}**`,
    `- Critical warning matches: **${criticalHits.length}**`,
    "",
    "## Warning classes",
    "| Count | Warning class |",
    "| ---: | --- |",
    warningRows,
    "",
    "## Unexpected warnings",
    "| Count | Warning class |",
    "| ---: | --- |",
    unexpectedRows,
    "",
    "## Critical warning matches",
    "| Count | Warning class |",
    "| ---: | --- |",
    criticalRows,
    "",
  ].join("\n");
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const logPath = resolve(options.log);
  const logContents = readFileSync(logPath, "utf8");
  const warnings = collectWarnings(logContents);

  const expectedWarnings = options.expected ? new Set(readLines(resolve(options.expected))) : new Set();
  const criticalMatchers = options.critical ? readLines(resolve(options.critical)) : [];

  const unexpectedWarnings = warnings.filter(({ message }) => !expectedWarnings.has(message));
  const criticalHits = warnings.filter(({ message }) => criticalMatchers.some((matcher) => message.includes(matcher)));

  const totalWarnings = warnings.reduce((sum, warning) => sum + warning.count, 0);
  const metrics = {
    generatedAt: new Date().toISOString(),
    totalWarnings,
    uniqueWarningClasses: warnings.length,
    unexpectedWarningClasses: unexpectedWarnings.length,
    criticalWarningClasses: criticalHits.length,
    warnings,
    unexpectedWarnings,
    criticalHits,
  };

  if (options.metricsOut) {
    const metricsPath = resolve(options.metricsOut);
    ensureParentDirectory(metricsPath);
    writeFileSync(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`);
  }

  if (options.summaryOut) {
    const summaryPath = resolve(options.summaryOut);
    ensureParentDirectory(summaryPath);
    writeFileSync(
      summaryPath,
      renderSummary({ warnings, unexpectedWarnings, criticalHits, totalWarnings }),
    );
  }

  if (options.failOnNew && (unexpectedWarnings.length > 0 || criticalHits.length > 0)) {
    console.error(
      [
        "Cloudflare warning budget exceeded.",
        `Unexpected warning classes: ${unexpectedWarnings.length}`,
        `Critical warning matches: ${criticalHits.length}`,
      ].join(" "),
    );
    process.exit(1);
  }
};

main();
