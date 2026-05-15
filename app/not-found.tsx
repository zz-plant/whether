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
            <ButtonLink href="/evidence" variant="ghost">Evidence</ButtonLink>
            <ButtonLink href="/planning" variant="ghost">Planning</ButtonLink>
            <ButtonLink href="/resolve" variant="ghost">Decision Tools</ButtonLink>
            <ButtonLink href="/trust" variant="ghost">Trust</ButtonLink>
          </>
        )}
      />
    </SecondaryPageShell>
  );
}
