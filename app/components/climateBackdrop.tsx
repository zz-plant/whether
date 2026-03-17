import { RegimeIconType } from "./regimeIcons";

const getRegimeStyles = (regime: RegimeIconType | "NEUTRAL") => {
  switch (regime) {
    case "EXPANSION":
      return {
        primary: "rgba(20, 184, 166, 0.12)",
        secondary: "rgba(34, 197, 94, 0.08)",
      };
    case "VOLATILE":
      return {
        primary: "rgba(14, 165, 233, 0.1)",
        secondary: "rgba(99, 102, 241, 0.08)",
      };
    case "DEFENSIVE":
      return {
        primary: "rgba(245, 158, 11, 0.07)",
        secondary: "rgba(71, 85, 105, 0.08)",
      };
    case "SCARCITY":
      return {
        primary: "rgba(244, 63, 94, 0.08)",
        secondary: "rgba(15, 23, 42, 0.14)",
      };
    default:
      return {
        primary: "rgba(125, 211, 252, 0.08)",
        secondary: "rgba(99, 102, 241, 0.07)",
      };
  }
};

export const ClimateBackdrop = ({ regime }: { regime: RegimeIconType | "NEUTRAL" }) => {
  const styles = getRegimeStyles(regime);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(1200px 800px at 50% -10%, ${styles.primary}, transparent 70%),
            radial-gradient(800px 600px at 10% 90%, ${styles.secondary}, transparent 80%),
            radial-gradient(800px 600px at 90% 90%, ${styles.primary}, transparent 80%)
          `,
        }}
      />
      <div className="weather-climate-backdrop-shade absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/18 to-slate-950" />
    </div>
  );
};
