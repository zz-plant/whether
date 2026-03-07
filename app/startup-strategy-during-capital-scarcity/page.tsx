import { redirect } from "next/navigation";

export const revalidate = 900;

export default function LegacyAnswerRoute() {
  redirect("/answers/startup-strategy-during-capital-scarcity");
}
