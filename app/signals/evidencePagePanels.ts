export const loadSignalsPagePanels = async ({
  showDetail,
  showAdvanced,
  showFullDiagnostics,
}: {
  /** The deeper view. The advanced-controls header renders here in both of
   *  its states, since it is where the "show advanced filters" link lives. */
  showDetail: boolean;
  showAdvanced: boolean;
  showFullDiagnostics: boolean;
}) => {
  const [signalDiagnostics, advancedControls, advancedPanels] = await Promise.all([
    showFullDiagnostics
      ? import("./components/signalVisualizationSuite").then(
          (module) => module.SignalVisualizationSuite,
        )
      : Promise.resolve(null),
    showDetail
      ? import("./components/advancedThresholdsSection").then(
          (module) => module.AdvancedThresholdsSection,
        )
      : Promise.resolve(null),
    showAdvanced
      ? Promise.all([
          import("./components/timeMachinePanel").then((module) => module.TimeMachinePanel),
          import("./components/regimeTimelinePanel").then(
            (module) => module.RegimeTimelinePanel,
          ),
        ])
      : Promise.resolve(null),
  ]);

  return {
    SignalVisualizationSuite: signalDiagnostics,
    AdvancedThresholdsSection: advancedControls,
    TimeMachinePanel: advancedPanels?.[0] ?? null,
    RegimeTimelinePanel: advancedPanels?.[1] ?? null,
  };
};
