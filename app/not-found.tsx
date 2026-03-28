import { SecondaryPageHeader, SecondaryPageShell } from "./components/secondaryPageShell";
import { ButtonLink } from "./components/ui/buttonLink";

export default function NotFound() {
  return (
    <SecondaryPageShell width="compact">
      <SecondaryPageHeader
        eyebrow="Route unavailable"
        title="That link moved, but your next step is still available."
        description="Some older routes were replaced during the IA update. Continue with the current command surface, review Evidence first, or open Planning without losing intent."
        actions={(
          <>
            <ButtonLink href="/" variant="primary">Open Weekly Brief</ButtonLink>
            <ButtonLink href="/signals" variant="ghost">Review evidence</ButtonLink>
            <ButtonLink href="/operations" variant="ghost">Open Planning</ButtonLink>
          </>
        )}
      />
    </SecondaryPageShell>
  );
}
