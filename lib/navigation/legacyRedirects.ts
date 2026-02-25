import { permanentRedirect } from "next/navigation";

export const redirectTo = (targetPath: string): never => {
  permanentRedirect(targetPath);
};

export const redirectWithParams = async <TParams extends Record<string, string>>(
  paramsPromise: Promise<TParams>,
  resolveTargetPath: (params: TParams) => string,
): Promise<never> => {
  const params = await paramsPromise;
  permanentRedirect(resolveTargetPath(params));
};
