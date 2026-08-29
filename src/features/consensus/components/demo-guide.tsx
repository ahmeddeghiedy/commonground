"use client";

import { Bot, CheckCircle2, Copy, ShieldCheck, X } from "lucide-react";

const DEMO_PROMPT =
  "Read the CommonGround workspace, explain the conflicts, compare all scenarios, and recommend the fairest hotel. Do not change anything yet.";

export function DemoGuide({
  webmcpReady,
  toolCount,
  onClose,
  onCopyPrompt,
}: {
  webmcpReady: boolean;
  toolCount: number;
  onClose: () => void;
  onCopyPrompt: (prompt: string) => void;
}) {
  return (
    <div className="cg-overlay cg-overlay--guide" role="presentation" onMouseDown={onClose}>
      <section
        className="cg-demo-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-guide-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="cg-icon-btn" type="button" onClick={onClose} aria-label="Close demo guide"><X size={18} /></button>
        <div className="cg-eyebrow"><Bot size={14} /> Judge-ready walkthrough</div>
        <h2 id="demo-guide-title">Tell the whole story in three minutes.</h2>
        <p className="cg-demo-lead">Start with a clean workspace. Let the agent read first, make one visible change, then stop at the human approval gate.</p>

        <div className={`cg-readiness ${webmcpReady ? "is-ready" : "is-warning"}`}>
          {webmcpReady ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}
          <div>
            <strong>{webmcpReady ? `${toolCount} WebMCP tools registered` : "17 tools ready; browser connection unavailable"}</strong>
            <span>{webmcpReady ? "The live agent can read and act on this board." : "In the ChatGPT desktop built-in browser, enable Site Tools under Browser settings → Permissions, use an eligible account/model, then reload."}</span>
          </div>
        </div>

        <ol className="cg-demo-steps">
          <li><span>1</span><div><strong>Read and reason</strong><p>Ask the agent to inspect the group, identify hard constraints and compare fairness.</p></div></li>
          <li><span>2</span><div><strong>Make a visible, reversible write</strong><p>Ask: “Switch the visible board to the compromise scenario, preserving locked constraints.”</p></div></li>
          <li><span>3</span><div><strong>Show the safety boundary</strong><p>Ask it to prepare a booking draft for the top option. The drawer opens, but no purchase occurs.</p></div></li>
        </ol>

        <div className="cg-prompt-copy">
          <code>{DEMO_PROMPT}</code>
          <button type="button" className="cg-btn cg-btn--primary" onClick={() => onCopyPrompt(DEMO_PROMPT)}><Copy size={14} /> Copy opening prompt</button>
        </div>
        <p className="cg-demo-footnote">Full presenter script, setup, recovery steps and evidence checklist are in <strong>docs/DEMO_GUIDE.md</strong>.</p>
      </section>
    </div>
  );
}
