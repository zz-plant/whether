import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "../../../lib/navigation/routeType";

const isRouteHref = (href: string) => href.startsWith("/");

export const InternalAwareLink = ({
  href,
  className,
  children,
  ariaCurrent,
}: {
  href: string;
  className: string;
  children: ReactNode;
  ariaCurrent?: "page" | "step";
}) => {
  if (isRouteHref(href)) {
    return (
      <Link href={href as Route} className={className} aria-current={ariaCurrent}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} aria-current={ariaCurrent}>
      {children}
    </a>
  );
};
