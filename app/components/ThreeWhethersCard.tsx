import type { ActionStripItem } from "../../lib/report/operatingCalls";
import { ThreeWhethersCardClient } from "./ThreeWhethersCardClient";

export function ThreeWhethersCard({
  items,
  sharedFlipCorridor,
}: {
  items: ActionStripItem[];
  sharedFlipCorridor?: string | null;
}) {
  return (
    <ThreeWhethersCardClient
      items={items}
      sharedFlipCorridor={sharedFlipCorridor}
    />
  );
}

