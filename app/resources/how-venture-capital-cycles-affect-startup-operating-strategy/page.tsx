import { notFound } from "next/navigation";
import { findPainArticleBySlug } from "../../../lib/painArticles";
import { buildPainArticleMetadata, PainArticlePage } from "../components/painArticlePage";

const article = findPainArticleBySlug("how-venture-capital-cycles-affect-startup-operating-strategy");

export const metadata = article ? buildPainArticleMetadata(article) : {};

export default function Page() {
  if (!article) notFound();
  return <PainArticlePage article={article} />;
}
