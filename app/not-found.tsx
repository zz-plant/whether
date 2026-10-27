import { navigationGroups } from "../lib/navigation/informationArchitecture";
import { SecondaryPageHeader } from "./components/secondaryPageShell";
import { ActionLink } from "./components/ui/actionLink";
import { ContentPageShell } from "./components/ui/contentPageShell";

/* The header's groups, read from the IA. This page hand-listed its own copy and
   kept "Planning" and "Decision Tools" after the header renamed both. */
export default function NotFound() {
  return (
    <ContentPageShell measure="content">
      <SecondaryPageHeader
        title="Page not found"
        description="That older link no longer works, but the weekly brief and the pages behind it are still here."
        actions={(
          <>
            {navigationGroups.map((group, index) => (
              <ActionLink key={group.key} href={group.href} variant={index === 0 ? "primary" : "ghost"}>
                {group.label}
              </ActionLink>
            ))}
          </>
        )}
      />
    </ContentPageShell>
  );
}
