"use client";

import { useEffect, useRef, useState } from "react";

export type CommandFilter = "All" | "Playbook" | "Pages" | "Sections";

const STORAGE_KEY = "whether-command-center-query";
const FILTER_STORAGE_KEY = "whether-command-center-filter";
const VISITED_KEY = "whether-command-center-visited";
const filterOrder: CommandFilter[] = ["All", "Playbook", "Pages", "Sections"];

const isCommandFilter = (value: string): value is CommandFilter => filterOrder.includes(value as CommandFilter);

export function useCommandCenterPreferences() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CommandFilter>("All");
  const [isMobile, setIsMobile] = useState(false);
  const [isFirstSession, setIsFirstSession] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const queryRef = useRef(query);
  const isExpandedRef = useRef(isExpanded);
  const hasUserSetFilterRef = useRef(false);

  const persistQuery = (value: string) => {
    sessionStorage.setItem(STORAGE_KEY, value);
  };

  useEffect(() => {
    const initialQuery = sessionStorage.getItem(STORAGE_KEY);
    if (initialQuery) {
      setQuery(initialQuery);
    }

    const storedFilter = sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (storedFilter && isCommandFilter(storedFilter)) {
      hasUserSetFilterRef.current = true;
      setFilter(storedFilter);
    }

    const mobileMedia = window.matchMedia("(max-width: 639px)");
    const applyViewport = () => setIsMobile(mobileMedia.matches);
    applyViewport();

    const visited = window.localStorage.getItem(VISITED_KEY) === "1";
    if (!visited) {
      setIsFirstSession(true);
      setIsExpanded(false);
    }

    if (!storedFilter) {
      setFilter(mobileMedia.matches ? "Playbook" : "All");
    }

    const onChange = () => {
      applyViewport();
      if (hasUserSetFilterRef.current) {
        return;
      }
      setFilter((current) => {
        if (current !== "All" && current !== "Playbook") {
          return current;
        }
        return mobileMedia.matches ? "Playbook" : "All";
      });
    };

    mobileMedia.addEventListener("change", onChange);
    return () => {
      mobileMedia.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    const persistCurrentQuery = () => {
      persistQuery(queryRef.current);
    };
    const persistOnHidden = () => {
      if (document.visibilityState !== "hidden") {
        return;
      }
      persistCurrentQuery();
    };

    window.addEventListener("pagehide", persistCurrentQuery);
    document.addEventListener("visibilitychange", persistOnHidden);

    return () => {
      window.removeEventListener("pagehide", persistCurrentQuery);
      document.removeEventListener("visibilitychange", persistOnHidden);
      persistCurrentQuery();
    };
  }, []);

  useEffect(() => {
    sessionStorage.setItem(FILTER_STORAGE_KEY, filter);
  }, [filter]);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  const defaultFilter = isMobile ? "Playbook" : "All";
  const hasActiveRefinement = query.length > 0 || filter !== defaultFilter;

  const handleExpand = () => {
    setIsExpanded(true);
    if (isFirstSession) {
      setIsFirstSession(false);
      window.localStorage.setItem(VISITED_KEY, "1");
    }
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleCollapse = () => {
    persistQuery(queryRef.current);
    setIsExpanded(false);
  };

  const handleReset = () => {
    hasUserSetFilterRef.current = false;
    setQuery("");
    persistQuery("");
    setFilter(defaultFilter);
    searchInputRef.current?.focus();
  };

  return {
    query,
    setQuery,
    filter,
    setFilter,
    isMobile,
    isFirstSession,
    isExpanded,
    searchInputRef,
    queryRef,
    isExpandedRef,
    hasUserSetFilterRef,
    persistQuery,
    hasActiveRefinement,
    handleExpand,
    handleCollapse,
    handleReset,
  };
}
