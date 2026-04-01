import { SecondaryPageHeader, SecondaryPageShell } from "./components/secondaryPageShell";
import { ButtonLink } from "./components/ui/buttonLink";

export default function NotFound() {
  return (
    <SecondaryPageShell width="compact">
      <SecondaryPageHeader
        eyebrow="Route unavailable"
        title="That link moved. This week's brief is still here."
        description="Some older routes were retired during the IA update. The current brief, evidence, and planning page are still available."
        actions={(
          <>
            <ButtonLink href="/" variant="primary">Weekly Brief</ButtonLink>
            <ButtonLink href="/signals" variant="ghost">Evidence</ButtonLink>
            <ButtonLink href="/operations" variant="ghost">Planning</ButtonLink>
          </>
        )}
      />
    </SecondaryPageShell>
  );
}
