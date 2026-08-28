"use client";

import { CheckCircle2, ExternalLink, ShieldCheck, X } from "lucide-react";

export function WebMCPReadinessDialog({ supported, toolCount, onClose }: { supported: boolean; toolCount: number; onClose: () => void }) {
  return (
    <div className="cg-overlay cg-overlay--guide" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="cg-collab-dialog" role="dialog" aria-modal="true" aria-labelledby="webmcp-readiness-title">
        <button type="button" className="cg-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="cg-eyebrow"><ShieldCheck size={14} /> Agent connection</div>
        <h2 id="webmcp-readiness-title">{supported ? "Site Tools are connected." : "CommonGround is agent-ready."}</h2>
        <p className="cg-dialog-lead">{supported ? `${toolCount} structured tools are registered on this page. Your agent can read the group, explain trade-offs, and make permission-aware visible changes.` : "This browser session has not exposed the WebMCP interface. The website is ready; availability depends on the browser, account, selected model, and Site Tools permission."}</p>
        <div className={`cg-readiness ${supported ? "is-ready" : "is-warning"}`}>
          {supported ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}
          <div><strong>{supported ? `${toolCount} tools discovered` : "Browser connection unavailable"}</strong><span>{supported ? "Ask the agent about the open trip and approve the website-access prompt." : "In the ChatGPT desktop built-in browser, open Browser settings → Permissions and enable Site Tools. Then reload this page using an eligible account and model."}</span></div>
        </div>
        <ol className="cg-demo-steps cg-connection-steps">
          <li><span>1</span><div><strong>Use the desktop built-in browser</strong><p>Site Tools currently depend on the supported ChatGPT desktop browser experience.</p></div></li>
          <li><span>2</span><div><strong>Enable Site Tools</strong><p>Browser settings → Permissions → Enable Site Tools, then reload CommonGround.</p></div></li>
          <li><span>3</span><div><strong>Look for the address-bar arrow</strong><p>The arrow appears when tools are available and turns blue while the agent uses them.</p></div></li>
        </ol>
        <a className="cg-btn cg-btn--wide" href="https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app" target="_blank" rel="noreferrer">Open official Site Tools help <ExternalLink size={14} /></a>
      </section>
    </div>
  );
}
