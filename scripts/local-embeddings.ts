/** Shared Ollama transport for advisory developer tools. Never imported by the report. */
import { z } from "zod";

export const DEFAULT_EMBEDDING_MODEL = "embeddinggemma-2:740m";
export type EmbeddingOptions = { model: string; host: string; fetchImpl?: typeof fetch };
const responseSchema = z.object({ model: z.string(), embeddings: z.array(z.array(z.number().finite()).min(1)) });

export const normalizeVectors = (vectors: number[][]): number[][] => {
  const dimensions = vectors[0]?.length;
  if (!dimensions) throw new Error("embedding vectors must be nonempty");
  return vectors.map((vector) => {
    if (vector.length !== dimensions || vector.some((value) => !Number.isFinite(value))) throw new Error("embedding vectors must have consistent dimensions and finite values");
    const length = Math.hypot(...vector);
    if (!Number.isFinite(length) || length === 0) throw new Error("embedding vector has zero or invalid norm");
    return vector.map((value) => value / length);
  });
};

export const embedTexts = async (inputs: string[], options: EmbeddingOptions): Promise<number[][]> => {
  const response = await (options.fetchImpl ?? fetch)(new URL("/api/embed", options.host), {
    method: "POST", headers: { "content-type": "application/json" },
    redirect: "error",
    body: JSON.stringify({ model: options.model, input: inputs, keep_alive: "5m", truncate: false }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) throw new Error(`Ollama ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const parsed = responseSchema.parse(await response.json());
  if (parsed.model !== options.model) throw new Error(`unexpected embedding model: ${parsed.model}`);
  if (parsed.embeddings.length !== inputs.length) throw new Error(`Ollama returned ${parsed.embeddings.length} vectors for ${inputs.length} inputs`);
  return normalizeVectors(parsed.embeddings);
};
