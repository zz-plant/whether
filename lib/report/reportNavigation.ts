import type { ReportPageLink } from "../../app/components/reportShellNavigation";
import { primaryNavigation } from "../navigation/primaryNavigation";

export const reportPageLinks: ReportPageLink[] = primaryNavigation;

export const reportShellCorePaths = ["/", "/signals", "/operations"] as const;
