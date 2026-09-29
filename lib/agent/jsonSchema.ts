import { z } from "zod";

/**
 * A zod schema as the JSON Schema an agent reads in a tool listing.
 *
 * Rendered from the input side, so an argument that is accepted in more than one spelling
 * (a regime by key or by weather word) lists the one canonical set, and an object is not
 * marked closed to fields a later version adds. The dialect marker is dropped: MCP clients
 * differ on which drafts they can compile, and nothing here uses a keyword only one draft has.
 */
export const toPublishedJsonSchema = (schema: z.ZodType): Record<string, unknown> =>
  Object.fromEntries(Object.entries(z.toJSONSchema(schema, { io: "input" })).filter(([key]) => key !== "$schema"));
