import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "bun:test";

const readRepoFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("styling system contract", () => {
  const packageJson = JSON.parse(readRepoFile("package.json")) as {
    devDependencies: Record<string, string>;
  };
  const postcssConfig = readRepoFile("postcss.config.js");
  const tokens = readRepoFile("app/styles/tokens.css");
  const globals = readRepoFile("app/globals.css");
  const components = JSON.parse(readRepoFile("components.json")) as {
    tailwind: { config: string; css: string; cssVariables: boolean };
  };
  const classUtility = readRepoFile("src/lib/utils.ts");

  it("pins Tailwind core and its PostCSS adapter to the same v4 release", () => {
    const tailwindVersion = packageJson.devDependencies.tailwindcss;
    const postcssVersion = packageJson.devDependencies["@tailwindcss/postcss"];

    assert.equal(postcssVersion, tailwindVersion);
    assert.match(tailwindVersion, /^4\.\d+\.\d+$/);
    assert.match(postcssConfig, /["']@tailwindcss\/postcss["']\s*:\s*\{\}/);
  });

  it("keeps CSS-first tokens as the only Tailwind configuration source", () => {
    assert.match(tokens, /^@import ['"]tailwindcss['"];/m);
    assert.match(tokens, /@theme\s*\{/);
    assert.match(tokens, /@theme inline\s*\{/);
    assert.match(globals, /@import ['"]\.\/styles\/tokens\.css['"];/);
    assert.equal(components.tailwind.config, "");
    assert.equal(components.tailwind.css, "app/styles/tokens.css");
    assert.equal(components.tailwind.cssVariables, true);

    for (const config of [
      "tailwind.config.js",
      "tailwind.config.cjs",
      "tailwind.config.mjs",
      "tailwind.config.ts",
    ]) {
      assert.equal(existsSync(new URL(`../${config}`, import.meta.url)), false);
    }
  });

  it("retains one conditional class composition helper", () => {
    assert.match(classUtility, /import \{ clsx/);
    assert.match(classUtility, /import \{ twMerge \}/);
    assert.match(classUtility, /return twMerge\(clsx\(inputs\)\)/);
  });
});
