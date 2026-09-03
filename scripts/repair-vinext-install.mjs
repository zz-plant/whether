import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const vinextRoot = resolve(repoRoot, "node_modules", "vinext");
const vinextPackagePath = join(vinextRoot, "package.json");

const run = async () => {
  if (!existsSync(vinextPackagePath)) {
    return;
  }

  const vinextPackage = JSON.parse(await readFile(vinextPackagePath, "utf8"));
  const version = typeof vinextPackage.version === "string" ? vinextPackage.version : null;

  if (!version) {
    return;
  }

  const distRoot = join(vinextRoot, "dist");
  const sentinelFiles = [
    "server/app-ssr-entry.js",
    "server/html.js",
    "shims/navigation-state.js",
    "shims/url-utils.js",
    "shims/readonly-url-search-params.js",
    "shims/link.js",
    "shims/script.js",
    "utils/base-path.js",
  ];

  const missingSentinels = sentinelFiles.filter((relativePath) =>
    !existsSync(join(distRoot, relativePath)),
  );

  if (missingSentinels.length === 0) {
    return;
  }

  // Skip repair when running in CI with restored node_modules cache
  // (tarball download adds 2-5s to every CI run; cache already preserves dist/)
  if (process.env.CI && process.env.SKIP_VINEXT_REPAIR !== "false") {
    return;
  }

  const tempDir = await mkdtemp(join(tmpdir(), "whether-vinext-repair-"));

  try {
    const pack = spawnSync("npm", ["pack", `vinext@${version}`, "--silent"], {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (pack.status !== 0) {
      throw new Error(pack.stderr.trim() || pack.stdout.trim() || `npm pack failed for vinext@${version}`);
    }

    const tarballName = pack.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);

    if (!tarballName) {
      throw new Error(`npm pack did not return a tarball name for vinext@${version}`);
    }

    const extract = spawnSync("tar", ["-xf", tarballName], {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (extract.status !== 0) {
      throw new Error(extract.stderr.trim() || extract.stdout.trim() || `tar extraction failed for ${tarballName}`);
    }

    const sourceDistRoot = join(tempDir, "package", "dist");

    if (!existsSync(sourceDistRoot)) {
      throw new Error(`Extracted tarball for vinext@${version} does not contain package/dist`);
    }

    const copyMissingFiles = async (sourceDir, targetDir) => {
      const entries = await readdir(sourceDir, { withFileTypes: true });
      let restoredFiles = 0;

      for (const entry of entries) {
        const sourcePath = join(sourceDir, entry.name);
        const targetPath = join(targetDir, entry.name);

        if (entry.isDirectory()) {
          restoredFiles += await copyMissingFiles(sourcePath, targetPath);
          continue;
        }

        if (entry.isSymbolicLink()) {
          continue;
        }

        if (existsSync(targetPath)) {
          continue;
        }

        mkdirSync(dirname(targetPath), { recursive: true });
        cpSync(sourcePath, targetPath);
        restoredFiles += 1;
      }

      return restoredFiles;
    };

    const restoredFiles = await copyMissingFiles(sourceDistRoot, distRoot);

    if (restoredFiles > 0) {
      console.log(
        `[repair-vinext-install] restored ${restoredFiles} missing Vinext dist file(s) for vinext@${version}.`,
      );
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};

void run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[repair-vinext-install] ${message}`);
  process.exitCode = 1;
});
