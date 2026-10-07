import { loopNavigationLayers } from "../lib/navigation/informationArchitecture";
import { SecondaryPageHeader } from "./components/secondaryPageShell";
import { ActionLink } from "./components/ui/actionLink";
import { ContentPageShell } from "./components/ui/contentPageShell";

/* The header's loop, read from the IA. This page hand-listed its own copy and
   kept "Planning" and "Decision Tools" after the header renamed both. */
export default function NotFound() {
  return (
    <ContentPageShell measure="content">
      <SecondaryPageHeader
        eyebrow="Page not found"
        title="That page moved."
        description="That older link no longer works, but the weekly brief and the pages behind it are still here."
        actions={(
          <>
            {loopNavigationLayers.map((layer, index) => (
              <ActionLink key={layer.key} href={layer.href} variant={index === 0 ? "primary" : "ghost"}>
                {layer.label}
              </ActionLink>
            ))}
          </>
        )}
      />
    </ContentPageShell>
  );
}
