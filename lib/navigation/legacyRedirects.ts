import { permanentRedirect } from "next/navigation";

type RedirectTarget = Parameters<typeof permanentRedirect>[0];

export const redirectTo = (targetPath: string): never => {
  permanentRedirect(targetPath as RedirectTarget);
};

export const redirectWithParams = async <TParams extends Record<string, string>>(
  paramsPromise: Promise<TParams>,
  resolveTargetPath: (params: TParams) => string,
): Promise<never> => {
  const params = await paramsPromise;
  permanentRedirect(resolveTargetPath(params) as RedirectTarget);
};
