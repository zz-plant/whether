export const ClimateBackdrop = ({ regime }: { regime: string }) => {
  const colorMap: Record<string, string> = {
    EXPANSION: "rgba(20, 184, 166, 0.06)",
    VOLATILE: "rgba(14, 165, 233, 0.05)",
    DEFENSIVE: "rgba(245, 158, 11, 0.04)",
    SCARCITY: "rgba(244, 63, 94, 0.04)",
    NEUTRAL: "rgba(125, 211, 252, 0.04)",
  };
  const color = colorMap[regime] ?? colorMap.NEUTRAL;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-0 transition-opacity duration-800"
        style={{
          backgroundImage: `radial-gradient(1200px 800px at 50% -10%, ${color}, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/10 to-slate-950" />
    </div>
  );
};
