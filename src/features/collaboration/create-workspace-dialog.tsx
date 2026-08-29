"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin, ShieldCheck, UserRound, Users, X } from "lucide-react";
import { MAX_TRAVELERS, MIN_TRAVELERS } from "./types";

interface CreateWorkspaceResponse { workspace: { id: string }; ownerToken: string; }

const steps = ["Trip", "Group", "Organizer"] as const;

export function CreateWorkspaceDialog({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Barcelona friends trip");
  const [destination, setDestination] = useState("Barcelona");
  const [nights, setNights] = useState(4);
  const [checkIn, setCheckIn] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 60); return date.toISOString().slice(0, 10); });
  const [organizerName, setOrganizerName] = useState("");
  const [travelerLimit, setTravelerLimit] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = step === 0
    ? name.trim().length >= 2 && destination.trim().length >= 2 && Boolean(checkIn) && nights >= 1 && nights <= 30
    : step === 1
      ? travelerLimit >= MIN_TRAVELERS && travelerLimit <= MAX_TRAVELERS
      : organizerName.trim().length > 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < steps.length - 1) { setStep((value) => value + 1); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, destination, nights, checkIn, organizerName, travelerLimit }),
      });
      const payload = (await response.json()) as CreateWorkspaceResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not create the trip");
      try { localStorage.setItem(`commonground:access:${payload.workspace.id}`, payload.ownerToken); } catch { /* URL fallback below */ }
      window.location.assign(`/w/${payload.workspace.id}?invite=${encodeURIComponent(payload.ownerToken)}&onboarding=1`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the trip");
      setBusy(false);
    }
  }

  return (
    <div className="cg-overlay cg-overlay--guide" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="cg-collab-dialog cg-create-wizard" role="dialog" aria-modal="true" aria-labelledby="create-trip-title">
        <button type="button" className="cg-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="cg-eyebrow"><Users size={14} /> Create your private trip</div>
        <div className="cg-wizard-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((label, index) => <div key={label} className={index === step ? "is-current" : index < step ? "is-done" : ""}><span>{index < step ? <Check size={12} /> : index + 1}</span><strong>{label}</strong></div>)}
        </div>

        <form className="cg-form" onSubmit={submit}>
          {step === 0 && <>
            <div className="cg-wizard-icon"><MapPin size={20} /></div>
            <h2 id="create-trip-title">Where is everyone going?</h2>
            <p className="cg-dialog-lead">Start with the trip basics. You can refine them later with your group or ask an agent to help.</p>
            <label>Trip name<input required autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Destination<input required maxLength={120} value={destination} onChange={(e) => setDestination(e.target.value)} /></label>
            <div className="cg-form-row"><label>Check-in<input required type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></label><label>Nights<input required min={1} max={30} type="number" value={nights} onChange={(e) => setNights(Number(e.target.value))} /></label></div>
          </>}

          {step === 1 && <>
            <div className="cg-wizard-icon"><Users size={20} /></div>
            <h2 id="create-trip-title">How many traveler seats?</h2>
            <p className="cg-dialog-lead">This includes you. Invite people individually after creation so each person controls a private decision profile.</p>
            <label className="cg-capacity-field cg-capacity-field--large"><span>Planned group size</span><strong>{travelerLimit} travelers</strong><input autoFocus type="range" min={MIN_TRAVELERS} max={MAX_TRAVELERS} value={travelerLimit} onChange={(e) => setTravelerLimit(Number(e.target.value))} /><small>Minimum {MIN_TRAVELERS} · maximum {MAX_TRAVELERS} · adjustable later</small></label>
            <div className="cg-capacity-presets" aria-label="Group size presets">{[4, 8, 15, 30].map((size) => <button key={size} type="button" className={travelerLimit === size ? "is-selected" : ""} onClick={() => setTravelerLimit(size)}>{size}<span>{size <= 4 ? "Small" : size <= 8 ? "Friends" : size <= 15 ? "Large" : "Tour"}</span></button>)}</div>
          </>}

          {step === 2 && <>
            <div className="cg-wizard-icon"><UserRound size={20} /></div>
            <h2 id="create-trip-title">Who is organizing?</h2>
            <p className="cg-dialog-lead">You will receive the organizer link, invite travelers, and guide the group through priorities and the final shortlist.</p>
            <label>Your name<input required autoFocus maxLength={60} placeholder="e.g. Amr" value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} /></label>
            <div className="cg-create-summary"><div><span>Trip</span><strong>{name}</strong></div><div><span>Stay</span><strong>{destination} · {checkIn} · {nights} nights</strong></div><div><span>Capacity</span><strong>{travelerLimit} travelers</strong></div></div>
            {error && <div className="cg-form-error" role="alert">{error}</div>}
          </>}

          <div className="cg-wizard-actions">
            {step > 0 ? <button type="button" className="cg-btn cg-btn--quiet" onClick={() => setStep((value) => value - 1)}><ArrowLeft size={15} /> Back</button> : <span />}
            <button type="submit" className="cg-btn cg-btn--primary" disabled={!canContinue || busy}>{busy ? "Creating…" : step < steps.length - 1 ? "Continue" : "Create workspace"}<ArrowRight size={16} /></button>
          </div>
        </form>
        <div className="cg-dialog-trust"><ShieldCheck size={15} /> After creation, the guided checklist opens automatically: invite people, add priorities, compare options, then involve your agent.</div>
      </section>
    </div>
  );
}
