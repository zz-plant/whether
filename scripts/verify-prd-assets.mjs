import { spawnSync } from "node:child_process";

const baseUrl = (process.argv[2] ?? "https://whether.work").replace(/\/$/, "");

const assets = [
  // Favicons and App Icons
  { path: "/favicon.ico", expectedType: /image\/(x-icon|vnd\.microsoft\.icon)/ },
  { path: "/favicon.svg", expectedType: /image\/svg\+xml/ },
  { path: "/favicon-dark.svg", expectedType: /image\/svg\+xml/ },
  { path: "/favicon-16.png", expectedType: /image\/png/ },
  { path: "/favicon-32.png", expectedType: /image\/png/ },
  { path: "/icon-16.png", expectedType: /image\/png/ },
  { path: "/icon-32.png", expectedType: /image\/png/ },
  { path: "/icon-192.png", expectedType: /image\/png/ },
  { path: "/icon-512.png", expectedType: /image\/png/ },
  { path: "/apple-touch-icon.png", expectedType: /image\/png/ },
  { path: "/safari-pinned-tab.png", expectedType: /image\/png/ },
  { path: "/safari-pinned-tab.svg", expectedType: /image\/svg\+xml/ },
  { path: "/icon.svg", expectedType: /image\/svg\+xml/ },
  { path: "/icon-light.svg", expectedType: /image\/svg\+xml/ },
  { path: "/whether-logo.svg", expectedType: /image\/svg\+xml/ },

  // Web Fonts
  { path: "/fonts/fraunces-600.woff2", expectedType: /font\/woff2/ },
  { path: "/fonts/fraunces-700.woff2", expectedType: /font\/woff2/ },
  { path: "/fonts/ibm-plex-sans-400.woff2", expectedType: /font\/woff2/ },
  { path: "/fonts/ibm-plex-sans-500.woff2", expectedType: /font\/woff2/ },
  { path: "/fonts/ibm-plex-sans-600.woff2", expectedType: /font\/woff2/ },
  { path: "/fonts/ibm-plex-sans-700.woff2", expectedType: /font\/woff2/ },

  // Satori / OG Fonts
  { path: "/fonts/og/fraunces-600.ttf", expectedType: /font\/(ttf|sfnt)|application\/(x-font-ttf|font-sfnt|octet-stream)/ },
  { path: "/fonts/og/ibm-plex-sans-400.ttf", expectedType: /font\/(ttf|sfnt)|application\/(x-font-ttf|font-sfnt|octet-stream)/ },
  { path: "/fonts/og/ibm-plex-sans-600.ttf", expectedType: /font\/(ttf|sfnt)|application\/(x-font-ttf|font-sfnt|octet-stream)/ },

  // Scripts & Downloads
  { path: "/embed.js", expectedType: /(application|text)\/(javascript|x-javascript)/ },
  { path: "/downloads/capital-posture-template.md", expectedType: /text\/(markdown|plain)/ },
  { path: "/downloads/quarterly-capital-posture-memo-example.md", expectedType: /text\/(markdown|plain)/ },
  { path: "/downloads/reversal-trigger-checklist.md", expectedType: /text\/(markdown|plain)/ },

  // Metadata, Discovery & Feeds
  { path: "/manifest.webmanifest", expectedType: /application\/(manifest\+json|json)/ },
  { path: "/robots.txt", expectedType: /text\/plain/ },
  { path: "/sitemap.xml", expectedType: /(application|text)\/xml/ },
  { path: "/.well-known/whether-agent.json", expectedType: /application\/json/ },
  { path: "/brief.md", expectedType: /text\/(markdown|plain)/ },
  { path: "/llms.txt", expectedType: /text\/plain/ },
  { path: "/feed.xml", expectedType: /(application|text)\/(rss\+)?xml/ },

  // Dynamic Image Generation
  { path: "/api/og", expectedType: /image\/png/ },
  { path: "/api/og?template=report", expectedType: /image\/png/ },
  { path: "/api/og?template=signals", expectedType: /image\/png/ },
  { path: "/api/og?template=solutions", expectedType: /image\/png/ },
  { path: "/api/og?template=policy", expectedType: /image\/png/ },
  { path: "/api/image/brief", expectedType: /image\/png/ },
  { path: "/api/image/slide", expectedType: /image\/svg\+xml/ },
];

function probe(asset) {
  const url = `${baseUrl}${asset.path}`;
  const res = spawnSync(
    "curl",
    [
      "-sS",
      "-i",
      "--max-time", "20",
      "-A", "Whether-Asset-Probe/1.0 (+https://github.com/zz-plant/whether)",
      url
    ],
    { encoding: "utf8" }
  );

  if (res.status !== 0) {
    return { ok: false, error: `curl execution failed: ${res.stderr.trim() || "unknown"}` };
  }

  const raw = res.stdout;
  const headerEnd = raw.indexOf("\r\n\r\n");
  const headersPart = headerEnd >= 0 ? raw.slice(0, headerEnd) : raw.slice(0, raw.indexOf("\n\n"));
  const headerLines = headersPart.split(/\r?\n/);
  const statusLine = headerLines[0] || "";
  const matchStatus = statusLine.match(/HTTP\/\S+\s+(\d+)/);
  const statusCode = matchStatus ? parseInt(matchStatus[1], 10) : 0;

  const getHeader = (name) => {
    const line = headerLines.find(l => l.toLowerCase().startsWith(name.toLowerCase() + ":"));
    return line ? line.slice(name.length + 1).trim() : null;
  };

  const contentType = getHeader("content-type") || "";
  const contentLength = getHeader("content-length") || "";
  const cacheControl = getHeader("cache-control") || "";

  const typeMatches = asset.expectedType ? asset.expectedType.test(contentType) : true;
  const is200 = statusCode === 200;

  return {
    ok: is200 && typeMatches,
    statusCode,
    contentType,
    contentLength,
    cacheControl,
    typeMatches,
  };
}

console.log(`\n🔍 Verifying assets on ${baseUrl} (${assets.length} total)...\n`);

let passed = 0;
let failed = 0;
const failures = [];

for (const asset of assets) {
  const result = probe(asset);
  if (result.ok) {
    passed++;
    console.log(`  ✅ [${result.statusCode}] ${asset.path} (${result.contentType || "no-type"}) ${result.contentLength ? `[${result.contentLength}B]` : ""}`);
  } else {
    failed++;
    const reason = !result.statusCode
      ? result.error
      : result.statusCode !== 200
      ? `HTTP ${result.statusCode}`
      : `Content-Type mismatch: got "${result.contentType}", expected ${asset.expectedType}`;
    console.log(`  ❌ [${result.statusCode || "ERR"}] ${asset.path} -> ${reason}`);
    failures.push({ path: asset.path, ...result, reason });
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${assets.length} assets.`);

if (failed > 0) {
  console.log("\n❌ Failed assets summary:");
  for (const f of failures) {
    console.log(`  - ${f.path}: ${f.reason}`);
  }
  process.exit(1);
} else {
  console.log("\n🎉 All production assets are fully accessible and valid!\n");
}
