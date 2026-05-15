import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  optimizeDeps: {
    exclude: ["@base-ui/react", "lucide-react"],
    include: ["use-sync-external-store/shim", "use-sync-external-store/shim/with-selector"],
  },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
