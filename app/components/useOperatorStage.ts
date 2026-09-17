"use client";

import {
  buildOperatorStageCookie,
  readOperatorStageCookie,
  type OperatorStage,
} from "../../lib/report/operatorStage";
import { createBrowserSource, useBrowserSource, useHydrated } from "./browserSource";

const STAGE_CHANGED_EVENT = "whether-operator-stage-changed";

/*
 * The stage cookie, as one source the whole page shares.
 *
 * Every control that sets a stage writes the same cookie and announces it, so
 * two panels on one page (the planner and the stress test on Planning) never
 * disagree. That announcement is what the store watches; before this, each
 * consumer kept its own copy of the cookie in state and re-read it from a mount
 * effect, which is the same synchronisation done once per component.
 *
 * `serverValue` is null — what a visitor who has never chosen a stage sees —
 * and React renders it through hydration, so the server's markup still matches.
 */
const stageSource = createBrowserSource<OperatorStage | null>({
  read: () => readOperatorStageCookie(document.cookie),
  serverValue: null,
  watch: (onChange) => {
    window.addEventListener(STAGE_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(STAGE_CHANGED_EVENT, onChange);
  },
  // The cookie outlives any one tree and can be set by a control that is no
  // longer mounted, so a new consumer re-reads rather than trusting the cache.
  refreshOnSubscribe: true,
});

export const useOperatorStage = () => {
  const stage = useBrowserSource(stageSource);
  const hydrated = useHydrated();

  return { stage, setStage: persistOperatorStage, hydrated };
};

/**
 * Writes the cookie and announces it. The announcement is the only update path:
 * the writer does not also set local state, so a control that changes the stage
 * and a panel that reads it cannot end up holding different answers.
 *
 * Exported for controls that write without holding the hook's state (the hero
 * selector), and used by the hook itself.
 */
export const persistOperatorStage = (stage: OperatorStage | null) => {
  document.cookie = buildOperatorStageCookie(stage);
  window.dispatchEvent(new CustomEvent(STAGE_CHANGED_EVENT));
};
