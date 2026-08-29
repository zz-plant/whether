"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Terminal, Check, Copy, X } from "lucide-react";

type Props = {
  regime: string;
  boldnessScore: number;
  weeklyCall?: string;
  className?: string;
};

export function DeveloperQuickAccess({
  regime,
  boldnessScore,
  weeklyCall = "Stage decisions. Avoid irreversible fixed-cost commitments.",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        whether: {
          url: "https://whether.work/api/mcp",
        },
      },
    },
    null,
    2,
  );

  const curlCommand = `curl -s "https://whether.work/api/weekly" | jq '.summary'`;

  const agentPrompt = `Current Macro Regime: ${regime} (Boldness Budget: ${boldnessScore}/100).\nWeekly Call: "${weeklyCall}".\nEnforce maximum 6-month payback horizon on technical refactors and require 18+ months forward cash buffer.`;

  const copyText = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-fluid-nano font-mono text-slate-400 hover:text-sky-300 transition-colors ${className}`}
        title="Developer API & MCP quick access"
      >
        <Terminal size={11} aria-hidden="true" />
        <span>MCP / API</span>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Popup
            className="fixed z-50 top-[15vh] left-1/2 -translate-x-1/2 w-full max-w-lg mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/90 text-slate-100"
            aria-label="Developer & Agent Integration"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="text-sky-400" size={18} />
                <h3 className="text-sm font-semibold">Agent &amp; Developer Quick Access</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
                  <span>Model Context Protocol (MCP) Server Config</span>
                  <button
                    type="button"
                    onClick={() => copyText(mcpConfig, "mcp")}
                    className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-[11px]"
                  >
                    {copiedKey === "mcp" ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedKey === "mcp" ? "Copied" : "Copy JSON"}</span>
                  </button>
                </div>
                <pre className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  <code>{mcpConfig}</code>
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
                  <span>cURL Endpoint</span>
                  <button
                    type="button"
                    onClick={() => copyText(curlCommand, "curl")}
                    className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-[11px]"
                  >
                    {copiedKey === "curl" ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedKey === "curl" ? "Copied" : "Copy Command"}</span>
                  </button>
                </div>
                <pre className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  <code>{curlCommand}</code>
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
                  <span>LLM System Prompt Macro Context</span>
                  <button
                    type="button"
                    onClick={() => copyText(agentPrompt, "prompt")}
                    className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-[11px]"
                  >
                    {copiedKey === "prompt" ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedKey === "prompt" ? "Copied" : "Copy Prompt"}</span>
                  </button>
                </div>
                <p className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 text-[11px] text-slate-300 leading-relaxed font-mono">
                  {agentPrompt}
                </p>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
