import { permanentRedirect } from "next/navigation";

export default function BriefPage() {
  permanentRedirect("/guides");
}
