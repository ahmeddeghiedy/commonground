"use client";

import { CheckCircle2, ExternalLink, FlaskConical, Globe2, MonitorCog, ShieldCheck, X } from "lucide-react";

const browserOptions = [
  { name: "ChatGPT desktop", status: "Supported", tone: "ready", icon: MonitorCog, instructions: "Open Browser settings → Permissions, enable Site Tools, reload CommonGround, then approve website access when prompted." },
  { name: "Chrome 149+", status: "Trial / testing", tone: "testing", icon: FlaskConical, instructions: "For a demo, enable chrome://flags/#enable-webmcp-testing and relaunch. Public no-flag access requires this origin to be enrolled in Chrome’s WebMCP origin trial." },
  { name: "Comet", status: "App only", tone: "fallback", icon: Globe2, instructions: "The complete workspace works because Comet is Chromium-based, but Perplexity does not currently document a native WebMCP switch. Its assistant may use normal page interaction instead." },
  { name: "Firefox", status: "App only", tone: "fallback", icon: Globe2, instructions: "The complete workspace works normally. Firefox does not currently expose document.modelContext, so the structured agent tools remain unavailable." },
] as const;

export function WebMCPReadinessDialog({ supported, toolCount, onClose }: { supported: boolean; toolCount: number; onClose: () => void }) {
  return (
    <div className="cg-overlay cg-overlay--guide" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="cg-collab-dialog cg-browser-dialog" role="dialog" aria-modal="true" aria-labelledby="webmcp-readiness-title">
        <button type="button" className="cg-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="cg-eyebrow"><ShieldCheck size={14} /> Browser & agent connection</div>
        <h2 id="webmcp-readiness-title">{supported ? "WebMCP is connected." : "CommonGround is WebMCP-ready."}</h2>
        <p className="cg-dialog-lead">{supported ? `${toolCount} structured tools are registered on this page. Your agent can read the group, explain trade-offs, and make permission-aware visible changes.` : "This browser has not exposed the WebMCP interface. CommonGround still works normally; use one of the supported setup paths below to connect its structured agent tools."}</p>
        <div className={`cg-readiness ${supported ? "is-ready" : "is-warning"}`}>
          {supported ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}
          <div><strong>{supported ? `${toolCount} tools discovered` : "Structured tools not connected in this session"}</strong><span>{supported ? "Ask the agent about the open trip and approve the website-access prompt." : "This is a browser capability or permission state—not a failure in the website."}</span></div>
        </div>
        <div className="cg-browser-grid" aria-label="WebMCP browser support">
          {browserOptions.map(({ name, status, tone, icon: Icon, instructions }) => (
            <article className="cg-browser-option" key={name}>
              <div className="cg-browser-option__head"><Icon size={16} /><strong>{name}</strong><span className={`cg-support-pill is-${tone}`}>{status}</span></div>
              <p>{instructions}</p>
            </article>
          ))}
        </div>
        <div className="cg-browser-note">
          <strong>How to confirm it worked</strong>
          <span>The header changes to “WebMCP · {toolCount} tools.” In ChatGPT desktop, the address-bar Site Tools arrow appears and turns blue while tools are used.</span>
        </div>
        <div className="cg-dialog-actions cg-browser-links">
          <a className="cg-btn" href="https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app" target="_blank" rel="noreferrer">OpenAI setup <ExternalLink size={14} /></a>
          <a className="cg-btn cg-btn--primary" href="https://developer.chrome.com/docs/ai/webmcp" target="_blank" rel="noreferrer">Chrome WebMCP setup <ExternalLink size={14} /></a>
        </div>
      </section>
    </div>
  );
}
