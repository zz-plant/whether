"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OperatorContextBanner, useOperatorContext } from "./operatorContextQuestions";

export function OperatorContextWrapper() {
  const router = useRouter();
  const context = useOperatorContext();
  const [setupDone, setSetupDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setSetupDone(!!localStorage.getItem("whether_setup_done"));
    } catch {}
    setReady(true);
  }, []);

  const handleSetContext = (
    stage: "pre-seed" | "seed" | "series-a" | "series-b-plus" | "public",
    sensitivity: "high" | "medium" | "low",
  ) => {
    context.setContext(stage, sensitivity);
    router.refresh();
  };

  // Don't show the config banner until we've checked if GuidedSetup was done.
  // If setup isn't done, the GuidedSetup handles first-time config instead.
  if (!ready) return null;
  if (!setupDone) return null;

  return (
    <OperatorContextBanner
      {...context}
      setContext={handleSetContext}
    />
  );
}
