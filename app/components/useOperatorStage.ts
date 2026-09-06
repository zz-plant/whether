"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildOperatorStageCookie,
  readOperatorStageCookie,
  type OperatorStage,
} from "../../lib/report/operatorStage";

const STAGE_CHANGED_EVENT = "whether-operator-stage-changed";

/**
 * The stage cookie, read on the client after mount. Every control that sets a
 * stage writes the same cookie and announces it, so two panels on one page
 * (the planner and the stress test on Planning) never disagree.
 *
 * `stage` is null until the effect runs, which is also what a visitor who has
 * never chosen one sees. Read it during render and the server markup would
 * differ from the client's, so the cookie is only ever read in an effect.
 */
export const useOperatorStage = () => {
  const [stage, setStageState] = useState<OperatorStage | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setStageState(readOperatorStageCookie(document.cookie));
    sync();
    setHydrated(true);
    window.addEventListener(STAGE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(STAGE_CHANGED_EVENT, sync);
  }, []);

  const setStage = useCallback((next: OperatorStage | null) => {
    document.cookie = buildOperatorStageCookie(next);
    setStageState(next);
    window.dispatchEvent(new CustomEvent(STAGE_CHANGED_EVENT));
  }, []);

  return { stage, setStage, hydrated };
};

/** For controls that write the cookie without holding the hook's state (the hero selector). */
export const persistOperatorStage = (stage: OperatorStage | null) => {
  document.cookie = buildOperatorStageCookie(stage);
  window.dispatchEvent(new CustomEvent(STAGE_CHANGED_EVENT));
};
