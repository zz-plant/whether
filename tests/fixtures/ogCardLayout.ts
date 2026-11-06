import { readFileSync } from "node:fs";
import { isValidElement, type ReactNode } from "react";
import { OG_FONT_BODY, OG_FONT_DISPLAY, OG_FONT_STAMP } from "../../lib/image/ogFonts";

/**
 * Satori's own rule, verbatim: a <div> whose children are anything other than a
 * single string must declare display. Breaking it throws *during* the render,
 * after the response headers are out -- so the route answers 200 with an empty
 * body and the decision card downloads as a 0-byte PNG. Nothing short of
 * rendering catches that, which is how it shipped unnoticed.
 */
export const findSatoriLayoutViolations = (node: ReactNode, path = "root"): string[] => {
  if (!isValidElement<{ children?: ReactNode; style?: Record<string, unknown> }>(node)) return [];

  const { children, style } = node.props;
  const tag = typeof node.type === "string" ? node.type : "component";
  const here = `${path} > ${tag}`;
  const display = style?.display;
  const violations: string[] = [];

  if (tag === "div" && children !== undefined && children !== null && typeof children !== "string") {
    if (display !== "flex" && display !== "none" && display !== "contents") {
      violations.push(`${here} holds a ${Array.isArray(children) ? "list" : typeof children} child without an explicit display`);
    }
  }

  const list = Array.isArray(children) ? children : [children];
  return list.reduce<string[]>(
    (found, child, index) => found.concat(findSatoriLayoutViolations(child, `${here}[${index}]`)),
    violations,
  );
};

export const ogFontFaces: Array<{ name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" }> = [
  { name: OG_FONT_DISPLAY, data: readFileSync("public/fonts/og/archivo-semicondensed-700.ttf"), weight: 700, style: "normal" },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/archivo-400.ttf"), weight: 400, style: "normal" },
  { name: OG_FONT_BODY, data: readFileSync("public/fonts/og/archivo-600.ttf"), weight: 600, style: "normal" },
  { name: OG_FONT_STAMP, data: readFileSync("public/fonts/og/archivo-expanded-700.ttf"), weight: 700, style: "normal" },
];
