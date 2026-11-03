#!/usr/bin/env node
/**
 * Serves the built Worker locally, in workerd, for the landmark audit, the UI tools and the
 * e2e email scripts: `bun run serve:worker [-- options]`. It replaced `wrangler dev` on
 * 2026-11-03, and takes the options those callers passed it:
 *
 *   --host <host> --port <port>   where to listen (default port 8787, as `wrangler dev` used)
 *   --var NAME:VALUE              a plain-text variable for this run only (repeatable)
 *   --persist-to <dir>            where local KV and Durable Object state live (default .wrangler/state)
 *   --remote-email                the EMAIL binding sends real mail (`bun run email:test`)
 *
 * The bundle is the production Build Output (`.cloudflare/output/v0/`, written by
 * `bun run build`), plus `WHETHER_ENABLE_MOCKUPS=1` so the gated design routes stay renderable
 * and their coverage does not silently drop out of the audit. A Vite preview serves Build
 * Output exactly as recorded, with no way to add a variable (`.dev.vars` and the process
 * environment are both ignored), and the recorded output is what `deploy:cloudflare` uploads,
 * so it is never edited. This copies it beside itself (`.cloudflare/audit-preview/`, about
 * 45MB, under a second; Build Output refuses symlinks) with the run's changes, and previews the copy.
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { WORKER_BUNDLE_MARKER, WORKER_BUNDLE_OUTPUT } from "./worker-bundle.mjs";

const PREVIEW_ROOT = ".cloudflare/audit-preview";
const DEFAULT_PORT = "8787";

const parseOptions = (args) => {
  const vars = { WHETHER_ENABLE_MOCKUPS: "1" };
  let persistTo = ".wrangler/state";
  let remoteEmail = false;
  const passthrough = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") continue;
    if (arg === "--var") {
      const [name, ...value] = (args[index + 1] ?? "").split(":");
      if (!name || value.length === 0) throw new Error(`--var takes NAME:VALUE (got "${args[index + 1] ?? ""}")`);
      vars[name] = value.join(":");
      index += 1;
    } else if (arg === "--persist-to") {
      persistTo = args[index + 1] ?? persistTo;
      index += 1;
    } else if (arg === "--remote-email") {
      remoteEmail = true;
    } else {
      passthrough.push(arg);
    }
  }
  if (!passthrough.includes("--port")) passthrough.push("--port", DEFAULT_PORT);
  return { vars, persistTo: resolve(persistTo), remoteEmail, passthrough };
};

const options = parseOptions(process.argv.slice(2));

if (!existsSync(WORKER_BUNDLE_MARKER)) {
  console.error(`No Build Output at ${WORKER_BUNDLE_OUTPUT}. Run \`bun run build\` first.`);
  process.exit(1);
}

rmSync(PREVIEW_ROOT, { recursive: true, force: true });
const source = join(WORKER_BUNDLE_OUTPUT, "workers", "default");
const target = join(PREVIEW_ROOT, WORKER_BUNDLE_OUTPUT, "workers", "default");
mkdirSync(target, { recursive: true });
cpSync(WORKER_BUNDLE_MARKER, join(PREVIEW_ROOT, WORKER_BUNDLE_MARKER));
for (const entry of readdirSync(source)) {
  if (entry === "worker.config.json") continue;
  cpSync(join(source, entry), join(target, entry), { recursive: true });
}

const workerConfig = JSON.parse(readFileSync(join(source, "worker.config.json"), "utf8"));
workerConfig.env = {
  ...workerConfig.env,
  ...Object.fromEntries(Object.entries(options.vars).map(([name, value]) => [name, { type: "text", value }])),
};
if (options.remoteEmail) {
  if (workerConfig.env.EMAIL?.type !== "send-email") throw new Error("the Build Output has no EMAIL send-email binding");
  workerConfig.env.EMAIL = { ...workerConfig.env.EMAIL, dev: { remote: true } };
}
writeFileSync(join(target, "worker.config.json"), JSON.stringify(workerConfig));
writeFileSync(
  join(PREVIEW_ROOT, "vite.config.mjs"),
  `import { cloudflare } from "@cloudflare/vite-plugin";\nexport default { plugins: [cloudflare({ persistState: { path: ${JSON.stringify(options.persistTo)} } })] };\n`,
);

const vite = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
const child = spawn(
  process.execPath,
  [vite, "preview", PREVIEW_ROOT, "--config", join(PREVIEW_ROOT, "vite.config.mjs"), ...options.passthrough],
  { stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
