/**
 * A deployment setting by name: the Worker binding on globalThis (worker/bindings.ts), else
 * `process.env`. An empty value counts as unset at either source, so an empty binding defers
 * to the environment. Trimmed by default, since most of these are keys and ids; a signing
 * secret passes `{ trim: false }` because it is used byte for byte.
 * docs/agents/lessons/runtime-helpers.md.
 */
export const readSetting = (name: string, { trim = true }: { trim?: boolean } = {}): string | null => {
  const usable = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const candidate = trim ? value.trim() : value;
    return candidate === "" ? null : candidate;
  };
  return usable(Reflect.get(globalThis, name))
    ?? usable(typeof process !== "undefined" ? process.env?.[name] : undefined);
};
