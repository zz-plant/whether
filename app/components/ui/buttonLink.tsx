import type { LinkProps } from "next/link";
import type { ReactNode } from "react";
import { ActionLink, type ActionLinkVariant } from "./actionLink";

type ButtonLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  variant?: Extract<ActionLinkVariant, "primary" | "pill" | "ghost">;
};

export function ButtonLink({ children, className, variant = "primary", ...linkProps }: ButtonLinkProps) {
  return (
    <ActionLink {...linkProps} className={className} variant={variant}>
      {children}
    </ActionLink>
  );
}
