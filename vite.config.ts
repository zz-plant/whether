import { defineConfig } from "vite";
import vinext from "vinext";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
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
