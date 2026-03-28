import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ActionLink, type ActionLinkVariant } from "./actionLink";

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
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
