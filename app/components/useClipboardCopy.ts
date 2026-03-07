"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHapticFeedback } from "./useHapticFeedback";

export type ClipboardCopyStatus = "idle" | "copying" | "copied" | "error";
type ClipboardCopyErrorReason = "unavailable" | "write-failed";
type ClipboardUiStateTarget = Pick<
  ClipboardCopyState,
  "status" | "error" | "activeTarget" | "copiedTarget"
>;

type ClipboardUiStateOptions = {
  includeError?: boolean;
  requireCopiedStatus?: boolean;
};

type UseClipboardCopyOptions = {
  resetDelay?: number;
};

export type ClipboardCopyState = {
  status: ClipboardCopyStatus;
  error: boolean;
  errorReason: ClipboardCopyErrorReason | null;
  activeTarget: string | null;
  copiedTarget: string | null;
  copyToClipboard: (text: string, target?: string) => Promise<boolean>;
};

export const getClipboardUiState = (
  target: string,
  state: ClipboardUiStateTarget,
  options: ClipboardUiStateOptions = {}
): ClipboardCopyStatus => {
  const { includeError = true, requireCopiedStatus = false } = options;

  if (state.status === "copying" && state.activeTarget === target) {
    return "copying";
  }

  if (state.copiedTarget === target && (!requireCopiedStatus || state.status === "copied")) {
    return "copied";
  }

  if (includeError && state.error) {
    return "error";
  }

  return "idle";
};

export const isClipboardTargetDisabled = (
  target: string,
  state: Pick<ClipboardCopyState, "status" | "activeTarget">
) => state.status === "copying" && state.activeTarget !== target;

export const useClipboardCopy = (
  options: UseClipboardCopyOptions = {}
): ClipboardCopyState => {
  const { resetDelay = 2000 } = options;
  const [status, setStatus] = useState<ClipboardCopyStatus>("idle");
  const [error, setError] = useState(false);
  const [errorReason, setErrorReason] = useState<ClipboardCopyErrorReason | null>(null);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const triggerHaptic = useHapticFeedback();

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
        return false;
      }
      if (!navigator.clipboard?.writeText) {
        setError(true);
        setErrorReason("unavailable");
        setStatus("error");
        triggerHaptic("warning");
        return false;
      }
      setStatus("copying");
      setActiveTarget(target ?? null);
      try {
        await navigator.clipboard.writeText(text);
        setError(false);
        setErrorReason(null);
        setStatus("copied");
        setCopiedTarget(target ?? null);
        triggerHaptic("success");
        clearResetTimer();
        timeoutRef.current = window.setTimeout(() => {
          setStatus("idle");
          setCopiedTarget(null);
        }, resetDelay);
        return true;
      } catch {
        setError(true);
        setErrorReason("write-failed");
        setStatus("error");
        triggerHaptic("error");
        return false;
      } finally {
        setActiveTarget(null);
      }
    },
    [clearResetTimer, resetDelay, status, triggerHaptic]
  );

  return {
    status,
    error,
    errorReason,
    activeTarget,
    copiedTarget,
    copyToClipboard,
  };
};
