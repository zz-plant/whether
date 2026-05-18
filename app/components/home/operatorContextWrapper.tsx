"use client";

import { useRouter } from "next/navigation";
import { OperatorContextBanner, useOperatorContext } from "./operatorContextQuestions";

export function OperatorContextWrapper() {
  const router = useRouter();
  const context = useOperatorContext();

  const handleSetContext = (
    stage: "pre-seed" | "seed" | "series-a" | "series-b-plus" | "public",
    sensitivity: "high" | "medium" | "low",
  ) => {
    context.setContext(stage, sensitivity);
    router.refresh();
  };

  return (
    <OperatorContextBanner
      {...context}
      setContext={handleSetContext}
    />
  );
}
