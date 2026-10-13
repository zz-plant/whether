/**
 * Bun's built-in HTMLRewriter (the Cloudflare streaming-HTML API), declared as far as
 * `scripts/advice-corpus/htmlText.ts` uses it. The repo carries no Bun or Workers type
 * package, and this is the one caller.
 */
export {};

declare global {
  interface HTMLRewriterTextChunk {
    readonly text: string;
  }

  interface HTMLRewriterElement {
    onEndTag(handler: () => void): void;
  }

  interface HTMLRewriterHandlers {
    element?(element: HTMLRewriterElement): void;
    text?(chunk: HTMLRewriterTextChunk): void;
  }

  class HTMLRewriter {
    on(selector: string, handlers: HTMLRewriterHandlers): HTMLRewriter;
    transform(input: string): string;
  }
}
