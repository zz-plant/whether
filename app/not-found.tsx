import { SecondaryPageHeader, SecondaryPageShell } from "./components/secondaryPageShell";
import { ButtonLink } from "./components/ui/buttonLink";

export default function NotFound() {
  return (
    <SecondaryPageShell width="compact">
      <SecondaryPageHeader
        eyebrow="Page not found"
        title="That page moved."
        description="That older link no longer works, but the weekly brief, evidence, and planning pages are still here."
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
