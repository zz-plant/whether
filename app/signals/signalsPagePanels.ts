export const loadSignalsPagePanels = async ({
  showAdvanced,
  showFullDiagnostics,
}: {
  showAdvanced: boolean;
  showFullDiagnostics: boolean;
}) => {
  const [summaryArchive, signalDiagnostics, advancedPanels] = await Promise.all([
    showAdvanced
      ? import("../../lib/summary/summaryArchive").then((module) => module.getSummaryArchive())
      : Promise.resolve(null),
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
    summaryArchive,
    SignalVisualizationSuite: signalDiagnostics,
    AdvancedThresholdsSection: advancedPanels?.[0] ?? null,
    TimeMachinePanel: advancedPanels?.[1] ?? null,
    RegimeTimelinePanel: advancedPanels?.[2] ?? null,
  };
};
