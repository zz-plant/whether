"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Toast } from "@base-ui/react/toast";
import {
  companyFinancialProfileFor,
  compareDecisionPlans,
  evaluateDecision,
  stressTestDecisionPlan,
  type DecisionAction,
  type DecisionCategory,
  type LifecycleStage,
} from "../../../lib/decisionShield";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import type { DecisionMemoryPayload } from "../../../lib/decisionMemory";
import {
  lifecycleStageForOperatorStage,
  operatorStageForLifecycleStage,
} from "../../../lib/report/operatorStage";
import { useOperatorProfile } from "../../components/useOperatorProfile";
import { useOperatorStage } from "../../components/useOperatorStage";
import {
  useClipboardCopy,
  type ClipboardCopyState,
} from "../../components/useClipboardCopy";
import { usePersistedQuerySelections } from "./usePersistedQuerySelections";
import {
  actionOptions,
  buildShareText,
  categoryOptions,
  lifecycleOptions,
  parseParam,
} from "./decisionShieldUtils";
import type { CurrentSelection } from "./useDecisionShieldPresets";

export type PlanMode = "dropdown" | "natural_language" | "compare";

const parsePlanMode = (value: string | null): PlanMode | null =>
  value === "dropdown" || value === "natural_language" || value === "compare" ? value : null;

const decisionShieldFieldConfigs = {
  lifecycle: {
    queryParam: "lifecycle",
    parse: (value: string | null) => parseParam(value, lifecycleOptions),
    serialize: (value: LifecycleStage) => value,
  },
  category: {
    queryParam: "category",
    parse: (value: string | null) => parseParam(value, categoryOptions),
    serialize: (value: DecisionCategory) => value,
  },
  action: {
    queryParam: "action",
    parse: (value: string | null) => parseParam(value, actionOptions),
    serialize: (value: DecisionAction) => value,
  },
} as const;

const DEFAULT_SHIELD_SELECTIONS: {
  lifecycle: LifecycleStage;
  category: DecisionCategory;
  action: DecisionAction;
} = {
  lifecycle: "GROWTH",
  category: "HIRING",
  action: "HIRE",
};

export const useDecisionShieldState = ({
  assessment,
  recordDate,
}: {
  assessment: RegimeAssessment;
  recordDate: string;
}) => {
  const {
    state: { lifecycle, category, action },
    setField,
  } = usePersistedQuerySelections({
    initialState: DEFAULT_SHIELD_SELECTIONS,
    storageKey: "whether.decisionShield",
    fields: decisionShieldFieldConfigs,
  });

  const { add } = Toast.useToastManager();
  const { status, error, errorReason, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy({
    commitment: "copied_brief",
  });
  const lastClipboardStatusRef = useRef<ClipboardCopyState["status"]>("idle");
  const [lastAttemptedTarget, setLastAttemptedTarget] = useState<"verdict" | "link" | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* A copied plan link (`copyLink` below) opens on the plan it was copied
     from: mode, both plans and the business model come off the address once,
     at mount, and are the reader's to edit from there. */
  const [planMode, setPlanMode] = useState<PlanMode>(
    () => parsePlanMode(searchParams.get("planMode")) ?? (searchParams.get("planB") ? "compare" : "natural_language"),
  );
  const [planText, setPlanText] = useState(() => searchParams.get("plan") ?? "");
  const [planBText, setPlanBText] = useState(() => searchParams.get("planB") ?? "");
  const [businessModel, setBusinessModel] = useState<"VC_BACKED" | "BOOTSTRAPPED">(() =>
    searchParams.get("model") === "BOOTSTRAPPED" ? "BOOTSTRAPPED" : "VC_BACKED",
  );
  const { profile, setProfileField } = useOperatorProfile();
  const { stage, setStage } = useOperatorStage();
  const initialUrlLifecycle = useRef(searchParams.get("lifecycle"));

  useEffect(() => {
    if (!stage || initialUrlLifecycle.current !== null) return;
    setField("lifecycle", lifecycleStageForOperatorStage[stage]);
  }, [setField, stage]);

  const selectLifecycle = useCallback((value: LifecycleStage) => {
    setField("lifecycle", value);
    setStage(operatorStageForLifecycleStage[value]);
  }, [setField, setStage]);

  const applyPresetSelection = useCallback((preset: CurrentSelection) => {
    setField("lifecycle", preset.lifecycle);
    setField("category", preset.category);
    setField("action", preset.action);
    setStage(operatorStageForLifecycleStage[preset.lifecycle]);
  }, [setField, setStage]);

  /* The stress test sizes a plan against cash: the balance itself when one was
     entered, else net burn × runway (`companyFinancialProfileFor`). */
  const companyProfile = useMemo(() => companyFinancialProfileFor(profile, businessModel), [profile, businessModel]);

  const planReady = planText.trim().length > 0;
  const comparisonReady = planReady && planBText.trim().length > 0;

  const stressTestResult = useMemo(
    () => stressTestDecisionPlan(assessment, { planText, lifecycle, companyProfile }),
    [assessment, planText, lifecycle, companyProfile]
  );

  const comparisonResult = useMemo(
    () => compareDecisionPlans(assessment, planText, planBText, companyProfile),
    [assessment, planText, planBText, companyProfile]
  );

  const output = useMemo(
    () => evaluateDecision(assessment, { lifecycle, category, action }),
    [assessment, lifecycle, category, action]
  );

  /* The stored snapshot is the reading on screen, not a fresh read: a decision
     is only judgeable later against the conditions its author actually saw. */
  const buildLedgerPayload = useCallback(
    (): DecisionMemoryPayload => {
      if (planMode === "natural_language" && planReady) {
        return {
          recordDate,
          decision: {
            lifecycle,
            category: stressTestResult.detectedCategory,
            action: stressTestResult.detectedAction,
            context: planText.trim(),
          },
          outcome: {
            verdict: stressTestResult.verdict,
            summary: stressTestResult.headline,
            guardrail: stressTestResult.boundedGuardrail,
            reversalTrigger: stressTestResult.reversalTrigger,
          },
          assessment: {
            regime: assessment.regime,
            scores: assessment.scores,
            thresholds: assessment.thresholds,
            inputs: assessment.inputs,
          },
        };
      }
      return {
        recordDate,
        decision: { lifecycle, category, action },
        outcome: {
          verdict: output.verdict,
          summary: output.summary,
          guardrail: output.guardrail,
          reversalTrigger: output.reversalTrigger,
        },
        assessment: {
          regime: assessment.regime,
          scores: assessment.scores,
          thresholds: assessment.thresholds,
          inputs: assessment.inputs,
        },
      };
    },
    [
      recordDate,
      planMode,
      planReady,
      planText,
      stressTestResult,
      lifecycle,
      category,
      action,
      output,
      assessment,
    ],
  );

  const shareText = useMemo(
    () =>
      buildShareText(assessment, lifecycle, category, action, output, {
        planMode,
        planText,
        planBText,
        stressTestResult,
        comparisonResult,
        businessModel,
        grossMarginPct: profile.grossMarginPct,
      }),
    [
      assessment,
      lifecycle,
      category,
      action,
      output,
      planMode,
      planText,
      planBText,
      stressTestResult,
      comparisonResult,
      businessModel,
      profile.grossMarginPct,
    ],
  );

  useEffect(() => {
    if (status === lastClipboardStatusRef.current) {
      return;
    }
    if (status === "copied") {
      if (copiedTarget === "verdict") {
        add({
          title: "Decision Shield copied",
          description: "The verdict is ready to paste.",
          type: "success",
        });
      }
      if (copiedTarget === "link") {
        add({
          title: "Plan link copied",
          description: "It opens this plan with these settings, graded against the week it is opened.",
          type: "success",
        });
      }
    }
    if (status === "error") {
      const isBlocked = errorReason === "unavailable";
      const onLink = lastAttemptedTarget === "link";
      add({
        title: isBlocked ? "Clipboard blocked" : "Copy failed",
        description: onLink
          ? isBlocked
            ? "Copy the URL from your browser address bar."
            : "Clipboard access failed. Try copying the URL manually."
          : isBlocked
            ? "Select the verdict text to share it manually."
            : "Clipboard access failed. Try copying manually.",
        type: "error",
      });
    }
    lastClipboardStatusRef.current = status;
  }, [add, copiedTarget, errorReason, lastAttemptedTarget, status]);

  const handleCopy = useCallback(async () => {
    if (status === "copying") {
      return;
    }
    setLastAttemptedTarget("verdict");
    await copyToClipboard(shareText, "verdict");
  }, [copyToClipboard, shareText, status]);

  const handleCopyLink = useCallback(async () => {
    if (status === "copying") {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("lifecycle", lifecycle);
    params.set("category", category);
    params.set("action", action);
    params.set("planMode", planMode);
    /* Only the text being graded travels: a plan typed and then abandoned for
       the dropdowns stays on this screen rather than going out in a link. */
    const setOrDelete = (key: string, value: string | null) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    setOrDelete("plan", planMode === "dropdown" ? null : planText.trim() || null);
    setOrDelete("planB", planMode === "compare" ? planBText.trim() || null : null);
    setOrDelete("model", businessModel === "BOOTSTRAPPED" ? "BOOTSTRAPPED" : null);

    const link = `${window.location.origin}${pathname}?${params.toString()}#ops-decision-shield`;
    setLastAttemptedTarget("link");
    await copyToClipboard(link, "link");
  }, [
    action,
    businessModel,
    category,
    copyToClipboard,
    lifecycle,
    pathname,
    planBText,
    planMode,
    planText,
    searchParams,
    status,
  ]);

  return {
    lifecycle,
    category,
    action,
    setField,
    selectLifecycle,
    applyPresetSelection,
    planMode,
    setPlanMode,
    planText,
    setPlanText,
    planBText,
    setPlanBText,
    businessModel,
    setBusinessModel,
    profile,
    setProfileField,
    planReady,
    comparisonReady,
    stressTestResult,
    comparisonResult,
    output,
    buildLedgerPayload,
    shareText,
    handleCopy,
    handleCopyLink,
    clipboardState: {
      status,
      error,
      activeTarget,
      copiedTarget,
    },
    lastAttemptedTarget,
  };
};
