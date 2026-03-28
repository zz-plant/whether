import { secondarySurfaceContractByKey, type SecondarySurfaceContract } from "../../lib/navigation/secondarySurfaceContract";
import { ButtonLink } from "./ui/buttonLink";
import { SecondaryPageSection } from "./secondaryPageShell";

type SecondarySurfaceStartBlockProps = {
  surface: SecondarySurfaceContract["surfaceKey"];
};

export function SecondarySurfaceStartBlock({ surface }: SecondarySurfaceStartBlockProps) {
  const contract = secondarySurfaceContractByKey[surface];

  return (
    <SecondaryPageSection
      eyebrow={`Secondary surface · ${contract.intentLabel}`}
      title="Start from Weekly Brief, then use this helper surface."
      description={contract.helperSummary}
      actions={(
        <>
          <ButtonLink href="/" variant="primary">
            Start from Weekly Brief
          </ButtonLink>
          <ButtonLink href={contract.parentHubHref} variant="pill">
            {contract.returnCtaLabel} ({contract.parentHubLabel})
          </ButtonLink>
        </>
      )}
    />
  );
}
