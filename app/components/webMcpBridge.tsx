"use client";

import { useEffect } from "react";

/** The request `callTool` sends to `/api/mcp`. */
export const buildWebMcpToolCall = (name: string, args: Record<string, unknown>): RequestInit => ({
  method: "POST",
  // The streamable-HTTP transport answers 406 unless Accept names both, and a browser fetch
  // sends a wildcard by default. The server replies in JSON (enableJsonResponse).
  headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name, arguments: args },
  }),
});

/**
 * Exposes WebMCP (Web Model Context Protocol) on `document.modelContext` and `window.modelContext`
 * so browser-based AI agents (such as Cloudflare Kitesurf or WebMCP-compliant browser agents)
 * can discover and call Whether's decision tools directly within the page context.
 */
export const WebMcpBridge = () => {
  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    try {
      const modelContext = {
        name: "whether",
        version: "1.0",
        manifestUri: "/.well-known/webmcp.json",
        mcpEndpoint: "/api/mcp",
        stateEndpoint: "/api/agent?view=state",
        async callTool(name: string, args: Record<string, unknown> = {}) {
          const response = await fetch("/api/mcp", buildWebMcpToolCall(name, args));
          return response.json();
        },
      };

      if (!("modelContext" in document)) {
        Object.defineProperty(document, "modelContext", {
          value: modelContext,
          configurable: true,
          writable: true,
        });
      }
      if (!("modelContext" in window)) {
        Object.defineProperty(window, "modelContext", {
          value: modelContext,
          configurable: true,
          writable: true,
        });
      }
    } catch {
      // Non-fatal if a browser or isolate restricts property extensions.
    }
  }, []);

  return null;
};
