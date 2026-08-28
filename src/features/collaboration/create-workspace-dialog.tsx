"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck, Users, X } from "lucide-react";
import { MAX_TRAVELERS, MIN_TRAVELERS } from "./types";

interface CreateWorkspaceDialogProps {
  onClose: () => void;
}

interface CreateWorkspaceResponse {
  workspace: { id: string };
  ownerToken: string;
}

export function CreateWorkspaceDialog({ onClose }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("Barcelona friends trip");
  const [destination, setDestination] = useState("Barcelona");
  const [nights, setNights] = useState(4);
  const [organizerName, setOrganizerName] = useState("");
  const [travelerLimit, setTravelerLimit] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, destination, nights, organizerName, travelerLimit }),
      });
      const payload = (await response.json()) as CreateWorkspaceResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not create the trip");
      const key = `commonground:access:${payload.workspace.id}`;
      try { localStorage.setItem(key, payload.ownerToken); } catch { /* URL fallback below */ }
      window.location.assign(`/w/${payload.workspace.id}?invite=${encodeURIComponent(payload.ownerToken)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the trip");
      setBusy(false);
    }
  }

  return (
    <div className="cg-overlay cg-overlay--guide" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="cg-collab-dialog" role="dialog" aria-modal="true" aria-labelledby="create-trip-title">
        <button type="button" className="cg-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="cg-eyebrow"><Users size={14} /> New shared workspace</div>
        <h2 id="create-trip-title">Give your group one place to decide.</h2>
        <p className="cg-dialog-lead">Choose the group size now and adjust it later. Every traveler receives a private link and controls their own priorities.</p>

        <form className="cg-form" onSubmit={submit}>
          <label>Trip name<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className="cg-form-row">
            <label>Destination<input required maxLength={80} value={destination} onChange={(e) => setDestination(e.target.value)} /></label>
            <label>Nights<input required min={1} max={30} type="number" value={nights} onChange={(e) => setNights(Number(e.target.value))} /></label>
          </div>
          <label>Your name<input required maxLength={60} autoFocus placeholder="e.g. Amr" value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} /></label>
          <label className="cg-capacity-field"><span>Planned group size</span><strong>{travelerLimit} travelers</strong><input type="range" min={MIN_TRAVELERS} max={MAX_TRAVELERS} value={travelerLimit} onChange={(e) => setTravelerLimit(Number(e.target.value))} /><small>Includes you · minimum {MIN_TRAVELERS}, maximum {MAX_TRAVELERS}</small></label>
          {error && <div className="cg-form-error" role="alert">{error}</div>}
          <button type="submit" className="cg-btn cg-btn--primary cg-btn--wide" disabled={busy}>
            {busy ? "Creating…" : "Create private workspace"}<ArrowRight size={16} />
          </button>
        </form>
        <div className="cg-dialog-trust"><ShieldCheck size={15} /> Your access link is the key. Only people you invite can open this workspace.</div>
      </section>
    </div>
  );
}
