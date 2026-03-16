import type { ReactNode } from "react";

type StreamedSectionRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: "none" | "short" | "medium" | "long";
};

const delayClassName = {
  none: "",
  short: "weather-stream-reveal--short",
  medium: "weather-stream-reveal--medium",
  long: "weather-stream-reveal--long",
} as const;

export const StreamedSectionReveal = ({
  children,
  className = "",
  delay = "none",
}: StreamedSectionRevealProps) => (
  <div className={["weather-stream-reveal", delayClassName[delay], className].filter(Boolean).join(" ")}>
    {children}
  </div>
);
