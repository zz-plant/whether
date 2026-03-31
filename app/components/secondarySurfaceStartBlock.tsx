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
      eyebrow={`Support path · ${contract.intentLabel}`}
      title={`Open ${contract.parentHubLabel} support when needed.`}
      description="This helper layer exists for proof or translation, not as a second workflow."
      actions={(
        <>
          <ButtonLink href="/" variant="primary">
            Weekly Brief
          </ButtonLink>
          <ButtonLink href={contract.parentHubHref} variant="pill">
            {contract.returnCtaLabel} ({contract.parentHubLabel})
          </ButtonLink>
        </>
      )}
    />
  );
}
