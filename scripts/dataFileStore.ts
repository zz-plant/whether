/**
 * The working tree as an archive file store (`lib/summary/regimeArchiveFiles.ts`): paths
 * are relative to the directory the script runs in, as the generators always wrote them,
 * and a missing file reads as null.
 */
import { readFile, writeFile } from "node:fs/promises";
import type { ArchiveFileStore } from "../lib/summary/regimeArchiveFiles";

const isMissingFile = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";

export const workingTreeStore: ArchiveFileStore = {
  async read(path) {
    try {
      return await readFile(path, "utf8");
    } catch (error) {
      if (isMissingFile(error)) {
        return null;
      }
      throw error;
    }
  },
  async write(path, content) {
    await writeFile(path, content, "utf8");
  },
};
