/**
 * A deployment setting by name: the Worker binding `installBindings` put on globalThis
 * (worker/bindings.ts), else `process.env` for scripts, local runs and the suite. A value
 * that is empty counts as unset at either source, so an empty binding defers to the
 * environment rather than standing for "configured as nothing".
 *
 * This was written out by hand in eight places, and they did not all agree: some trimmed,
 * some did not, and three let an empty binding shadow the environment. Trimming is the
 * default because most of these are keys and ids, where a stray newline from a pasted value
 * is never meant. A signing secret is the exception and passes `{ trim: false }`: it is used
 * byte for byte, and trimming it would sign with a different key than the sender holds.
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
