"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  buildDisclosureHref,
  resolveDisclosureInitialOpen,
} from "./disclosureUrlState";

/**
 * A native `<details>` whose open state lives in the URL.
 *
 * Native rather than a JS collapsible on purpose: the panel works before
 * hydration, costs nothing in the client bundle, and its children stay
 * server-rendered. The only client work is reflecting the toggle into the query
 * string, so a shared link opens for the recipient on the same panel the sender
 * had open — see section XII of docs/agents/ui-ux-standards.md.
 *
 * Two deliberate implementation choices:
 *
 * - The `toggle` listener is attached to the node in an effect rather than via
 *   React's `onToggle`. `toggle` is a non-bubbling event, which makes it the
 *   awkward case for synthetic event systems; a native listener sidesteps the
 *   question entirely and also catches a toggle that happens before hydration.
 * - `open` is set once, from the server-resolved value, and never driven by
 *   React state afterwards. The element owns its own open/closed state; React
 *   re-asserting it on every toggle would mean fighting the browser for control
 *   of a control that already works.
 *
 * The read direction (a link with the query key renders the panel open) is
 * server-side and covered by tests. The write direction needs a live browser and
 * is not covered here.
 */

type UrlDetailsProps = {
  /** Query key that carries this panel's state, e.g. "why". */
  queryKey: string;
  /** Server-resolved open state for the first paint. */
  initialOpen?: boolean;
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  summaryClassName?: string;
  id?: string;
  queryValue?: string;
};

export function UrlDetails({
  queryKey,
  initialOpen = false,
  summary,
  children,
  className,
  summaryClassName,
  id,
  queryValue = "1",
}: UrlDetailsProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const node = detailsRef.current;
    if (!node) return undefined;

    const handleToggle = () => {
      const nextHref = buildDisclosureHref(
        window.location.pathname,
        new URLSearchParams(window.location.search),
        queryKey,
        node.open,
        queryValue,
      );
      const currentHref = `${window.location.pathname}${window.location.search}`;
      if (nextHref === currentHref) return;
      // replaceState, not pushState: opening a panel is not a navigation, and
      // pushing would make Back mean "close the panel I just opened" instead of
      // "go where I came from". The router's own state object is passed through,
      // as the decision picker does, so the app router keeps its entry; `{}` here
      // dropped it.
      window.history.replaceState(window.history.state, "", `${nextHref}${window.location.hash}`);
    };

    // Back/forward should move the panel with the rest of the page state.
    const handlePopState = () => {
      node.open = resolveDisclosureInitialOpen(
        new URLSearchParams(window.location.search),
        queryKey,
        queryValue,
        false,
      );
    };

    node.addEventListener("toggle", handleToggle);
    window.addEventListener("popstate", handlePopState);
    return () => {
      node.removeEventListener("toggle", handleToggle);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [queryKey, queryValue]);

  return (
    <details ref={detailsRef} id={id} className={className} open={initialOpen}>
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  );
}
