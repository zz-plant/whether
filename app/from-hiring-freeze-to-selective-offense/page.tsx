import { redirect } from "next/navigation";

export const revalidate = 900;

export default function LegacyAnswerRoute() {
  redirect("/answers/from-hiring-freeze-to-selective-offense");
}
