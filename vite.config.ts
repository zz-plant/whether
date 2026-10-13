import { defineConfig } from "vite";
import vinext from "vinext";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import { cloudflare } from "@cloudflare/vite-plugin";

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
  environments: {
    /* Server source maps only. Wrangler uploads them (`upload_source_maps` in wrangler.toml)
       so Workers Logs stack traces name real files and lines instead of a bundle offset.
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
