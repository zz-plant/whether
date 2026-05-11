"use client";

import { OperatorContextBanner, useOperatorContext } from "./operatorContextQuestions";

export function OperatorContextWrapper() {
  const context = useOperatorContext();
  return <OperatorContextBanner {...context} />;
}