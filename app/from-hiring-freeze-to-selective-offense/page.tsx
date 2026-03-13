import { redirectLegacyAnswer } from "../../lib/navigation/legacyRedirects";

export const revalidate = 900;

export default function LegacyAnswerRoute() {
  redirectLegacyAnswer("from-hiring-freeze-to-selective-offense");
}
