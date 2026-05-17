import { CallModeHeader } from "./weekly-card/CallModeHeader";
import { CallModeSections } from "./weekly-card/CallModeSections";
import {
  buildCallModePanelViewModel,
  type CallModePanelModel,
} from "./weekly-card/callModePanelModel";

export type { CallModePanelModel } from "./weekly-card/callModePanelModel";

export function WeeklyCallModePanel({
  model,
}: {
  model: CallModePanelModel;
}) {
  const viewModel = buildCallModePanelViewModel(model);

  return (
    <>
      <article className={viewModel.sectionSpacingClassName} aria-label="Weekly brief">
        <article id="weekly-call-core" className={`${viewModel.tierOnePanelClassName} relative overflow-hidden border-slate-800/70 bg-[linear-gradient(180deg,rgba(6,11,20,0.96),rgba(4,8,16,0.99))]`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-500/35 to-transparent" />
          <div className="relative space-y-4">
            <CallModeHeader viewModel={viewModel} />
            <CallModeSections viewModel={viewModel} />
          </div>
        </article>
      </article>
    </>
  );
}
