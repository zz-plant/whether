/*
 * The workstream tab row's box, shared by the row and its Suspense fallback so
 * the skeleton is the row's height by construction. The fallback used to be a
 * panel holding a heading and four card blocks — several times the height of
 * the row it stood in for — so the plan below jumped when the nav arrived.
 *
 * Lives outside the "use client" nav module on purpose: a server component
 * importing a string from a client module receives a client reference, not
 * the string.
 */
export const WORKSTREAM_NAV_CLASS = "flex flex-wrap items-end gap-x-5 gap-y-1";
