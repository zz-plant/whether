export const ClimateBackdrop = ({ regime }: { regime: string }) => {
  const colorMap: Record<string, string> = {
    EXPANSION: "rgba(20, 184, 166, 0.04)",
    VOLATILE: "rgba(14, 165, 233, 0.03)",
    DEFENSIVE: "rgba(245, 158, 11, 0.03)",
    SCARCITY: "rgba(244, 63, 94, 0.03)",
    NEUTRAL: "rgba(125, 211, 252, 0.03)",
  };
  const color = colorMap[regime] ?? colorMap.NEUTRAL;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};
