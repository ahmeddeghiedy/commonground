"use client";

import { Settings2, Users, X } from "lucide-react";
import { MAX_TRAVELERS, MIN_TRAVELERS } from "./types";

export function WorkspaceSettingsDialog({ travelerLimit, currentCount, onClose, onSave }: {
  travelerLimit: number;
  currentCount: number;
  onClose: () => void;
  onSave: (limit: number) => void;
}) {
  return (
    <div className="cg-overlay cg-overlay--guide" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="cg-collab-dialog" role="dialog" aria-modal="true" aria-labelledby="group-settings-title">
        <button type="button" className="cg-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="cg-eyebrow"><Settings2 size={14} /> Workspace settings</div>
        <h2 id="group-settings-title">Set the size of your group.</h2>
        <p className="cg-dialog-lead">The limit controls how many private traveler seats can be invited. You can increase it anytime, or reduce it down to the number already in the workspace.</p>
        <label className="cg-capacity-field cg-capacity-field--large">
          <span><Users size={15} /> Traveler capacity</span>
          <strong>{travelerLimit} seats</strong>
          <input type="range" min={Math.max(MIN_TRAVELERS, currentCount)} max={MAX_TRAVELERS} value={travelerLimit} onChange={(e) => onSave(Number(e.target.value))} />
          <small>{currentCount} joined or invited · {Math.max(0, travelerLimit - currentCount)} seats available</small>
        </label>
        <div className="cg-dialog-actions"><button type="button" className="cg-btn cg-btn--primary" onClick={onClose}>Done</button></div>
      </section>
    </div>
  );
}
