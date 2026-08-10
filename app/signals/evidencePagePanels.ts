export const loadSignalsPagePanels = async ({
  showAdvanced,
  showFullDiagnostics,
}: {
  showAdvanced: boolean;
  showFullDiagnostics: boolean;
}) => {
  const [signalDiagnostics, advancedPanels] = await Promise.all([
    showFullDiagnostics
      ? import("./components/signalVisualizationSuite").then(
          (module) => module.SignalVisualizationSuite,
        )
      : Promise.resolve(null),
    showAdvanced
      ? Promise.all([
          import("./components/advancedThresholdsSection").then(
            (module) => module.AdvancedThresholdsSection,
          ),
          import("./components/timeMachinePanel").then((module) => module.TimeMachinePanel),
          import("./components/regimeTimelinePanel").then(
            (module) => module.RegimeTimelinePanel,
          ),
        ])
      : Promise.resolve(null),
  ]);

  return {
    SignalVisualizationSuite: signalDiagnostics,
    AdvancedThresholdsSection: advancedPanels?.[0] ?? null,
    TimeMachinePanel: advancedPanels?.[1] ?? null,
    RegimeTimelinePanel: advancedPanels?.[2] ?? null,
  };
};
