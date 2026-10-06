/**
 * Whether two strings are equal, in time that depends on neither's content and only on the
 * length of the first.
 *
 * Put the value the caller supplied first and the secret second: the work is one pass over the
 * supplied value, reading the secret cyclically and folding the length difference into the
 * result, so neither the secret's characters nor its length change how long a guess takes. This
 * used to return as soon as the lengths differed, which let anyone holding a cron route time
 * their way to the length of `WHETHER_CRON_SECRET`.
 */
export function constantTimeCompare(supplied: string, expected: string): boolean {
  let mismatch = supplied.length ^ expected.length;
  for (let i = 0; i < supplied.length; i++) {
    // An empty `expected` reads NaN here, which `^` takes as 0; the length term has already failed it.
    mismatch |= supplied.charCodeAt(i) ^ expected.charCodeAt(i % expected.length);
  }
  return mismatch === 0;
}
