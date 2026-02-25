import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version: tailwindVersion } = require("tailwindcss/package.json");
const tailwindMajorVersion = Number.parseInt(tailwindVersion.split(".")[0] ?? "0", 10);

const config = {
  plugins: {
    [tailwindMajorVersion >= 4 ? "@tailwindcss/postcss" : "tailwindcss"]: {},
    autoprefixer: {},
  },
};

export default config;
