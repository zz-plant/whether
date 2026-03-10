import { answerPages } from "./decisionPages";

export const featuredAnswerPages = answerPages
  .filter((page) => typeof page.featuredOrder === "number")
  .sort((a, b) => (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER));
