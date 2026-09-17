"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toRoute } from "../../../lib/navigation/routeType";
import { createKeyedBrowserSource, useBrowserSource } from "../../components/browserSource";

type QueryFieldConfig<TValue> = {
  queryParam: string;
  parse: (value: string | null) => TValue | null;
  serialize: (value: TValue) => string | null;
};

type QueryFieldConfigMap<TState extends Record<string, unknown>> = {
  [K in keyof TState]: QueryFieldConfig<TState[K]>;
};

/** What a selection looks like in storage: one serialized string per field, or null. */
type StoredSelections = Record<string, string | null>;

/*
 * The saved selections, per storage key, checked on the way in.
 *
 * Reading this in an effect and assigning it into state is what the
 * react/set-state-in-effect finding here was: the panel rendered its defaults,
 * then the saved selection, then whatever the URL said, in whichever order the
 * effects happened to run. Precedence is stated in `baseline` below instead,
 * and this is just the read.
 */
const storedSelectionsFor = createKeyedBrowserSource<StoredSelections | null>({
  read: (key) => {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return null;
      const parsed: unknown = JSON.parse(stored);
      if (typeof parsed !== "object" || parsed === null) return null;
      const selections: StoredSelections = {};
      for (const [field, value] of Object.entries({ ...parsed })) {
        if (typeof value === "string" || value === null) selections[field] = value;
      }
      return Object.keys(selections).length > 0 ? selections : null;
    } catch {
      // A slot this browser cannot read is the same as one it has not filled.
      return null;
    }
  },
  serverValue: null,
});

export function usePersistedQuerySelections<TState extends Record<string, unknown>>({
  initialState,
  storageKey,
  fields,
}: {
  initialState: TState;
  storageKey: string;
  fields: QueryFieldConfigMap<TState>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /* Captured once, because it is the *initial* state and callers build it as an
     inline literal: read every render, every value derived from it would be a
     new object every render, and the effects below would re-run on each. */
  const [defaults] = useState(initialState);
  const stored = useBrowserSource(storedSelectionsFor(storageKey));

  const hasAnyUrlSelection = useMemo(
    () => Object.values(fields).some((config) => searchParams.has(config.queryParam)),
    [fields, searchParams],
  );

  /**
   * Where a selection comes from, in order: the URL when it names a value this
   * field understands, then what this browser saved if the URL names nothing at
   * all, then the caller's default. A URL that names only unreadable values
   * still wins over storage — the reader followed a link, and quietly restoring
   * a different selection under it is the behaviour this replaces.
   */
  const baseline = useMemo(() => {
    const next = { ...defaults };

    /* `for...in` over a mapped type rather than `Object.entries`, here and
       below: entries widens the key to `string`, and narrowing it back is the
       type assertion this file used to carry in four places. */
    let fromUrl = false;
    for (const key in fields) {
      const parsed = fields[key].parse(searchParams.get(fields[key].queryParam));
      if (parsed === null) continue;
      next[key] = parsed;
      fromUrl = true;
    }
    if (fromUrl || hasAnyUrlSelection || !stored) return next;

    for (const key in fields) {
      const parsed = fields[key].parse(stored[key] ?? null);
      if (parsed !== null) next[key] = parsed;
    }
    return next;
  }, [defaults, fields, hasAnyUrlSelection, searchParams, stored]);

  /* Edits carry the baseline they were made against, so a URL change replaces
     them by not matching rather than through an effect that assigns over them. */
  const baselineKey = JSON.stringify(baseline);
  const [edited, setEdited] = useState<{ baseline: string; value: TState } | null>(null);
  const state = edited?.baseline === baselineKey ? edited.value : baseline;

  const setField = useCallback(
    <K extends keyof TState>(key: K, value: TState[K]) => {
      setEdited((previous) => {
        const base = previous?.baseline === baselineKey ? previous.value : baseline;
        if (Object.is(base[key], value)) return previous;
        return { baseline: baselineKey, value: { ...base, [key]: value } };
      });
    },
    [baseline, baselineKey],
  );

  useEffect(() => {
    try {
      const serializableState: StoredSelections = {};
      for (const key in fields) {
        serializableState[key] = fields[key].serialize(state[key]);
      }
      window.localStorage.setItem(storageKey, JSON.stringify(serializableState));
    } catch {
      // Intentionally ignore storage persistence errors to keep console clean.
    }
  }, [fields, state, storageKey]);

  /* The URL is where a selection is shareable, so state is published to it —
     which is also how a restored selection reaches the rest of the page. It
     settles in one step: once the URL carries the selection, `baseline` reads
     it back unchanged and this produces the same search string. */
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    for (const key in fields) {
      const serializedValue = fields[key].serialize(state[key]);
      if (serializedValue) {
        nextParams.set(fields[key].queryParam, serializedValue);
      } else {
        nextParams.delete(fields[key].queryParam);
      }
    }

    const nextSearch = nextParams.toString();
    if (nextSearch === searchParams.toString()) return;

    router.push(toRoute(`${pathname}?${nextSearch}`), { scroll: false });
  }, [fields, pathname, router, searchParams, state]);

  return { state, setField };
}
