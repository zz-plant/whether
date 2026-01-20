"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ClipboardCopyStatus = "idle" | "copying" | "copied" | "error";

type UseClipboardCopyOptions = {
  resetDelay?: number;
};

export type ClipboardCopyState = {
  status: ClipboardCopyStatus;
  error: boolean;
  activeTarget: string | null;
  copiedTarget: string | null;
  copyToClipboard: (text: string, target?: string) => Promise<void>;
};

export const useClipboardCopy = (
  options: UseClipboardCopyOptions = {}
): ClipboardCopyState => {
  const { resetDelay = 2000 } = options;
  const [status, setStatus] = useState<ClipboardCopyStatus>("idle");
  const [error, setError] = useState(false);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearResetTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearResetTimer();
    };
  }, [clearResetTimer]);

  const copyToClipboard = useCallback(
    async (text: string, target?: string) => {
      if (status === "copying") {
        return;
      }
      if (!navigator.clipboard?.writeText) {
        setError(true);
        setStatus("error");
        return;
      }
      setStatus("copying");
      setActiveTarget(target ?? null);
      try {
        await navigator.clipboard.writeText(text);
        setError(false);
        setStatus("copied");
        setCopiedTarget(target ?? null);
        clearResetTimer();
        timeoutRef.current = window.setTimeout(() => {
          setStatus("idle");
          setCopiedTarget(null);
        }, resetDelay);
      } catch {
        setError(true);
        setStatus("error");
      } finally {
        setActiveTarget(null);
      }
    },
    [clearResetTimer, resetDelay, status]
  );

  return {
    status,
    error,
    activeTarget,
    copiedTarget,
    copyToClipboard,
  };
};
