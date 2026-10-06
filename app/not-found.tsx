import { SecondaryPageHeader } from "./components/secondaryPageShell";
import { ActionLink } from "./components/ui/actionLink";
import { ContentPageShell } from "./components/ui/contentPageShell";

export default function NotFound() {
  return (
    <ContentPageShell measure="content">
      <SecondaryPageHeader
        eyebrow="Page not found"
        title="That page moved."
        description="That older link no longer works, but the weekly brief, evidence, and planning pages are still here."
        actions={(
          <>
            <ActionLink href="/" variant="primary">Weekly Brief</ActionLink>
            <ActionLink href="/signals" variant="ghost">Evidence</ActionLink>
            <ActionLink href="/operate" variant="ghost">Planning</ActionLink>
            <ActionLink href="/resolve" variant="ghost">Decision Tools</ActionLink>
            <ActionLink href="/trust" variant="ghost">Trust</ActionLink>
          </>
        )}
      />
    </ContentPageShell>
  );
}
