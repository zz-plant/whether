import type { ComponentProps } from "react";
import { JsonLdScript } from "../jsonLdScript";
import { StickyCallStrip } from "../StickyCallStrip";

type StickyProps = ComponentProps<typeof StickyCallStrip>;

/**
 * The two tags that close the brief: the assembled structured-data graph and the floating
 * call strip. They were inline in `app/page.tsx`; neither reads page state, so both move
 * together and the page keeps its last lines about the reading.
 */
export function HomePageTail({
  structuredData,
  call,
  direction,
  weatherWord,
  marginLabel,
  shareLines,
}: {
  structuredData: ComponentProps<typeof JsonLdScript>["data"];
} & Pick<StickyProps, "call" | "direction" | "weatherWord" | "marginLabel" | "shareLines">) {
  return (
    <>
      <JsonLdScript data={structuredData} />
      <StickyCallStrip
        call={call}
        direction={direction}
        weatherWord={weatherWord}
        marginLabel={marginLabel}
        shareLines={shareLines}
      />
    </>
  );
}
