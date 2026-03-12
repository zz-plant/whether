type CliQueryRequest = {
  nextUrl: {
    searchParams: URLSearchParams;
  };
};

const toUnique = (values: string[]) => Array.from(new Set(values));

export const rejectUnsupportedCliQuery = (request: CliQueryRequest, supportedParams: string[]) => {
  const allowed = new Set(supportedParams);
  const provided = toUnique(Array.from(request.nextUrl.searchParams.keys()));
  const unsupported = provided.filter((key) => !allowed.has(key));

  if (unsupported.length === 0) {
    return null;
  }

  return Response.json(
    {
      error: "Unsupported query parameters.",
      unsupported,
      supported: supportedParams,
    },
    { status: 400 },
  );
};

export const parseAsOfSearchParam = (asOf: string | null) => {
  if (!asOf) return {};

  const match = asOf.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < 2000) {
    return null;
  }

  return {
    month: String(month),
    year: String(year),
  };
};
