type SlugParam = { slug: string };

export const sortStaticParamsBySlug = <T extends SlugParam>(params: readonly T[]): T[] =>
  [...params].sort((left, right) => left.slug.localeCompare(right.slug));

export const uniqueSortedStaticSlugs = (slugs: readonly string[]): SlugParam[] =>
  sortStaticParamsBySlug([...new Set(slugs)].map((slug) => ({ slug })));
