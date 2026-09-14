export type Route = `/${string}`;

export const isRoute = (value: string): value is Route => value.startsWith("/");

export const toRoute = (value: string): Route => {
  if (!isRoute(value)) throw new Error(`Not a route path: ${value}`);
  return value;
};
