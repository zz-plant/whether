"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackActivationEvent, type ActivationCommitment } from "../../lib/activationFunnel";

type ClipboardCopyStatus = "idle" | "copying" | "copied" | "error";
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
  /**
   * The activation funnel's `committed` step, for a copy of the guidance itself.
   * Reported once per confirmed write, never on a failed one. A function picks
   * it per target, for a control that copies more than one format; returning
   * null leaves that target unreported. Plain `null` is a caller saying the
   * copy is not the guidance at all — an article anchor, a blank template, a
   * preview-only sample — and `tests/copyCommitmentCoverage.test.ts` requires
   * every caller to say one or the other.
   *
   * Only `/share` reported a copy until 2026-09-23, so every copy made on `/` —
   * Copy Brief, the sticky strip, the share rail — was invisible to the funnel
   * that defines activation as a copy or a subscribe.
   */
  commitment?: ActivationCommitment | null | ((target: string | null) => ActivationCommitment | null);
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
  const { resetDelay = 2000, commitment } = options;
  const [status, setStatus] = useState<ClipboardCopyStatus>("idle");
  const [error, setError] = useState(false);
  const [errorReason, setErrorReason] = useState<ClipboardCopyErrorReason | null>(null);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const statusRef = useRef<ClipboardCopyStatus>("idle");

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
      if (statusRef.current === "copying") {
        return false;
      }
      if (!navigator.clipboard?.writeText) {
        setError(true);
        setErrorReason("unavailable");
        setStatus("error");
        statusRef.current = "error";
        return false;
      }
      setStatus("copying");
      statusRef.current = "copying";
      setActiveTarget(target ?? null);
      try {
        await navigator.clipboard.writeText(text);
        setError(false);
        setErrorReason(null);
        setStatus("copied");
        statusRef.current = "copied";
        setCopiedTarget(target ?? null);
        const committed = typeof commitment === "function" ? commitment(target ?? null) : commitment;
        if (committed) {
          trackActivationEvent({ step: "committed", path: window.location.pathname, commitment: committed });
        }
        clearResetTimer();
        timeoutRef.current = window.setTimeout(() => {
          setStatus("idle");
          statusRef.current = "idle";
          setCopiedTarget(null);
        }, resetDelay);
        return true;
      } catch {
        setError(true);
        setErrorReason("write-failed");
        setStatus("error");
        statusRef.current = "error";
        return false;
      } finally {
        setActiveTarget(null);
      }
    },
    [clearResetTimer, commitment, resetDelay]
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
