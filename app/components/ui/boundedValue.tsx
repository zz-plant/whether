/* A bounded rule read at a glance.
 *
 * These strings ("net-new hiring if funding pressure rises above 76 or risk
 * appetite falls below 44") were set in monospace so the numbers would stand
 * out. Monospace is the wrong instrument for it: it is the widest face in the
 * stack applied to the longest strings on the smallest screen, so the rule wraps
 * to three rows at 430px — which the Slack screenshot contract in
 * docs/one-screen-weekly-brief-spec.md forbids — and it puts the weekly brief in
 * a terminal register rather than an operator one.
 *
 * The number is what the reader is actually scanning for, so emphasize the
 * number and nothing else. Weight carries it, not hue: hue is reserved for
 * posture (tighten vs. loosen) and stops meaning anything if it also marks
 * "this is a value".
 */

/* Split keeps the delimiters, so the numerals survive as their own parts. */
const NUMBER_SPLIT = /(\d+(?:\.\d+)?%?)/g;
const IS_NUMBER = /^\d+(?:\.\d+)?%?$/;

export function BoundedValue({
  children,
  className,
}: {
  children: string | null | undefined;
  className?: string;
}) {
  if (!children) return null;

  return (
    <span className={className}>
      {children.split(NUMBER_SPLIT).map((part, index) =>
        IS_NUMBER.test(part) ? (
          // slate-100 rather than text-white: the slate scale is bound to the
          // theme text roles via @theme inline, so it inverts correctly in light
          // mode without relying on the class-name patch layer in tokens.css.
          <strong key={index} className="font-semibold text-slate-100">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </span>
  );
}
