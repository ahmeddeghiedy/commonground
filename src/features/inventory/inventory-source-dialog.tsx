"use client";

import { Database, RefreshCw, ShieldCheck, X } from "lucide-react";

export interface InventorySourceInfo {
  id: "demo" | "wadjet" | "custom";
  name: string;
  mode: "live" | "demo" | "fallback";
  fetchedAt?: string;
  fallbackReason?: string;
}

export function InventorySourceDialog({ info, onClose, onRefresh }: { info: InventorySourceInfo; onClose: () => void; onRefresh: () => void }) {
  const live = info.mode === "live";
  return (
    <div className="cg-overlay cg-overlay--guide" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="cg-collab-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-source-title">
        <button type="button" className="cg-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="cg-eyebrow"><Database size={14} /> Inventory source</div>
        <h2 id="inventory-source-title">{live ? `${info.name} is live.` : "Reliable demo inventory is active."}</h2>
        <p className="cg-dialog-lead">{live ? "Prices and availability are requested server-side and normalized into CommonGround’s provider-neutral hotel model." : info.mode === "fallback" ? `${info.name} could not be reached, so CommonGround automatically switched to the curated catalog.` : "The challenge catalog is deterministic, presentation-safe, and uses the exact same scoring and WebMCP flow as a live supplier."}</p>
        <div className={`cg-readiness ${live ? "is-ready" : "is-warning"}`}><ShieldCheck size={18} /><div><strong>{info.name}</strong><span>{info.fetchedAt ? `Last checked ${new Date(info.fetchedAt).toLocaleString()}. ` : ""}Provider credentials always remain on the server.</span></div></div>
        <div className="cg-provider-flow"><span>Wadjet or another API</span><i>→</i><span>Secure adapter</span><i>→</i><span>Common hotel model</span><i>→</i><span>Fairness engine</span></div>
        {info.fallbackReason && <div className="cg-form-error">Fallback reason: {info.fallbackReason}</div>}
        <button type="button" className="cg-btn cg-btn--primary cg-btn--wide" onClick={() => { onRefresh(); onClose(); }}><RefreshCw size={15} /> Refresh inventory</button>
      </section>
    </div>
  );
}
