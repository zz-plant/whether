import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ServerStoreAdapter, ServerStoreSnapshot } from "./serverStore";

export const createFileServerStoreAdapter = (
  storeFilePath: string,
  parseSnapshot: (value: unknown) => ServerStoreSnapshot,
  createEmptySnapshot: () => ServerStoreSnapshot,
): ServerStoreAdapter => ({
  kind: "file",
  async load() {
    try {
      const raw = await readFile(storeFilePath, "utf8");
      return parseSnapshot(JSON.parse(raw));
    } catch {
      return createEmptySnapshot();
    }
  },
  async save(nextSnapshot) {
    const output = `${JSON.stringify(nextSnapshot, null, 2)}\n`;
    const directory = dirname(storeFilePath);
    const tempPath = `${storeFilePath}.tmp`;

    await mkdir(directory, { recursive: true });
    await writeFile(tempPath, output, "utf8");
    await rename(tempPath, storeFilePath);
  },
});
