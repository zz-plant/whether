import { defineConfig } from "vite";
import vinext from "vinext";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import { cloudflare } from "@cloudflare/vite-plugin";
import { buildCommit } from "./scripts/exec.mjs";

const LOG_LEVELS = ["info", "warn", "error", "silent"] as const;
type BuildLogLevel = (typeof LOG_LEVELS)[number];
const isLogLevel = (value: string): value is BuildLogLevel => LOG_LEVELS.some((level) => level === value);
const parseLogLevel = (value: string | undefined): BuildLogLevel | undefined =>
  value && isLogLevel(value) ? value : undefined;

export default defineConfig({
  /* scripts/cloudflare-run.mjs sets this to "warn" on Workers Builds, where the per-chunk
     size tables run to ~1,000 lines and push the deploy's own result out of the log window.
     Unset everywhere else, so a local build prints what it always has. */
  logLevel: parseLogLevel(process.env.WHETHER_BUILD_LOG_LEVEL),
  /* The commit /api/health reports (lib/runtime/versionMetadata.ts); "" from a dirty checkout. */
  define: { __WHETHER_BUILD_COMMIT__: JSON.stringify(buildCommit()) },
  /* Vinext 1.0 hands `dev` to Vite, whose default is localhost:5173 (::1 on a Mac). The README,
     the CLI's default, launch.json and the capture scripts all read this address, so a clean
     clone's `bun run dev` answered none of them from 2026-10-11 until this was set. An explicit
     `--host` or `--port`, as scripts/dev-server.lib.mjs passes, still wins. */
  server: { host: "127.0.0.1", port: 3000 },
  environments: {
    /* Server source maps only. `cf deploy` uploads every map in the Build Output, so Workers
       Logs stack traces name real files and lines instead of a bundle offset.
       They are never served to a browser: the client environment keeps Vite's default. */
    rsc: { build: { sourcemap: true } },
    ssr: { build: { sourcemap: true } },
  },
  optimizeDeps: {
    exclude: ["@base-ui/react", "lucide-react"],
    include: ["use-sync-external-store/shim", "use-sync-external-store/shim/with-selector"],
  },
  plugins: [
    vinext({
      cache: {
        data: kvDataAdapter(),
      },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
