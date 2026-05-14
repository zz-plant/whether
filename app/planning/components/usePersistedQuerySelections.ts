"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "../../../lib/navigation/routeType";

type QueryFieldConfig<TValue> = {
  queryParam: string;
  parse: (value: string | null) => TValue | null;
  serialize: (value: TValue) => string | null;
};

type QueryFieldConfigMap<TState extends Record<string, unknown>> = {
  [K in keyof TState]: QueryFieldConfig<TState[K]>;
};

export function usePersistedQuerySelections<TState extends Record<string, unknown>>({
  initialState,
  storageKey,
  fields,
}: {
  initialState: TState;
  storageKey: string;
  fields: QueryFieldConfigMap<TState>;
}) {
  const [state, setState] = useState(initialState);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const restoredFromStorage = useRef(false);

  const parsedUrlState = useMemo(() => {
    const nextState = {} as Partial<TState>;
    for (const [key, config] of Object.entries(fields) as Array<[keyof TState, QueryFieldConfig<TState[keyof TState]>]>) {
      nextState[key] = config.parse(searchParams.get(config.queryParam)) as TState[keyof TState];
    }
    return nextState;
  }, [fields, searchParams]);

  const hasAnyUrlSelection = useMemo(
    () =>
      Object.values(fields).some((config) => searchParams.has(config.queryParam)),
    [fields, searchParams],
  );
  const hasValidUrlSelection = useMemo(
    () => Object.values(parsedUrlState).some((value) => value !== null && typeof value !== "undefined"),
    [parsedUrlState],
  );

  useEffect(() => {
    if (hasValidUrlSelection) {
      setState((previousState) => {
        let didChange = false;
        const nextState = { ...previousState };

        for (const [key, value] of Object.entries(parsedUrlState) as Array<[keyof TState, TState[keyof TState] | null | undefined]>) {
          if (value === null || typeof value === "undefined" || Object.is(previousState[key], value)) {
            continue;
          }
          nextState[key] = value;
          didChange = true;
        }

        return didChange ? nextState : previousState;
      });
      return;
    }

    if (hasAnyUrlSelection || restoredFromStorage.current) {
      return;
    }

    restoredFromStorage.current = true;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<Record<keyof TState, string | null>>;
      setState((previousState) => {
        let didChange = false;
        const nextState = { ...previousState };

        for (const [key, config] of Object.entries(fields) as Array<[keyof TState, QueryFieldConfig<TState[keyof TState]>]>) {
          const nextValue = config.parse((parsed[key] ?? null) as string | null);
          if (nextValue === null || typeof nextValue === "undefined" || Object.is(previousState[key], nextValue)) {
            continue;
          }
          nextState[key] = nextValue;
          didChange = true;
        }

        return didChange ? nextState : previousState;
      });
    } catch {
      // Intentionally ignore storage restore errors to keep console clean.
    }
  }, [fields, hasAnyUrlSelection, hasValidUrlSelection, parsedUrlState, storageKey]);

  useEffect(() => {
    try {
      const serializableState = {} as Record<string, string | null>;
      for (const [key, config] of Object.entries(fields) as Array<[keyof TState, QueryFieldConfig<TState[keyof TState]>]>) {
        serializableState[String(key)] = config.serialize(state[key]);
      }
      window.localStorage.setItem(storageKey, JSON.stringify(serializableState));
    } catch {
      // Intentionally ignore storage persistence errors to keep console clean.
    }
  }, [fields, state, storageKey]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    for (const [key, config] of Object.entries(fields) as Array<[keyof TState, QueryFieldConfig<TState[keyof TState]>]>) {
      const serializedValue = config.serialize(state[key]);
      if (serializedValue) {
        nextParams.set(config.queryParam, serializedValue);
      } else {
        nextParams.delete(config.queryParam);
      }
    }

    const nextSearch = nextParams.toString();
    const currentSearch = searchParams.toString();
    if (nextSearch === currentSearch) {
      return;
    }

    router.push(`${pathname}?${nextSearch}` as Route, { scroll: false });
  }, [fields, pathname, router, searchParams, state]);

  const setField = <K extends keyof TState>(key: K, value: TState[K]) => {
    setState((previousState) => (Object.is(previousState[key], value) ? previousState : { ...previousState, [key]: value }));
  };

  return {
    state,
    setField,
    setState,
  };
}
