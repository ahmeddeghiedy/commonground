"use client";

import { useMemo, useState } from "react";
import { Check, SlidersHorizontal, X } from "lucide-react";
import type { Constraint, Priority, Traveler } from "../consensus/types";

const OPTIONS: Array<Pick<Constraint, "label" | "category"> & { slug: string; suggested: Priority }> = [
  { slug: "step-free", label: "Step-free access", category: "accessibility", suggested: "must" },
  { slug: "roll-in-shower", label: "Roll-in shower", category: "accessibility", suggested: "must" },
  { slug: "family-rooms", label: "Family rooms", category: "family", suggested: "must" },
  { slug: "free-cancellation", label: "Free cancellation", category: "cancellation", suggested: "prefer" },
  { slug: "city-center", label: "City center", category: "location", suggested: "prefer" },
  { slug: "near-beach", label: "Near the beach", category: "location", suggested: "prefer" },
  { slug: "pool", label: "Pool", category: "amenity", suggested: "prefer" },
  { slug: "breakfast", label: "Breakfast included", category: "amenity", suggested: "flexible" },
  { slug: "gym", label: "Gym", category: "amenity", suggested: "flexible" },
  { slug: "review-score", label: "Review score 8.5+", category: "rating", suggested: "prefer" },
  { slug: "no-all-inclusive", label: "No all-inclusive resorts", category: "amenity", suggested: "exclude" },
];

const PRIORITY_COPY: Array<{ value: Priority; label: string; description: string }> = [
  { value: "must", label: "Must", description: "A deal-breaker" },
  { value: "prefer", label: "Prefer", description: "Important to me" },
  { value: "flexible", label: "Flexible", description: "Nice to have" },
  { value: "exclude", label: "Exclude", description: "Something to avoid" },
];

interface PriorityWizardProps { traveler: Traveler; onClose: () => void; onSave: (traveler: Traveler) => void; }

export function PriorityWizard({ traveler, onClose, onSave }: PriorityWizardProps) {
  const existing = useMemo(() => new Map(traveler.constraints.filter((c) => c.category !== "budget").map((c) => [c.label.toLowerCase(), c.priority])), [traveler.constraints]);
  const [budget, setBudget] = useState(traveler.budgetPerNight || 180);
  const [selected, setSelected] = useState<Record<string, Priority>>(() => Object.fromEntries(OPTIONS.flatMap((o) => {
    const priority = existing.get(o.label.toLowerCase());
    return priority ? [[o.slug, priority]] : [];
  })));

  function toggle(slug: string, suggested: Priority) {
    setSelected((current) => {
      const next = { ...current };
      if (next[slug]) delete next[slug]; else next[slug] = suggested;
      return next;
    });
  }

  function save() {
    const existingByLabel = new Map(traveler.constraints.map((c) => [c.label.toLowerCase(), c]));
    const constraints: Constraint[] = [{
      id: existingByLabel.get(`under €${traveler.budgetPerNight}/night`)?.id ?? `c-${traveler.id}-budget`,
      label: `Under €${budget}/night`, category: "budget", priority: "must", weight: 1.25, locked: true,
    }];
    for (const option of OPTIONS) {
      const priority = selected[option.slug];
      if (!priority) continue;
      const old = existingByLabel.get(option.label.toLowerCase());
      constraints.push({ id: old?.id ?? `c-${traveler.id}-${option.slug}`, label: option.label, category: option.category, priority, weight: priority === "must" ? 1.25 : 1, locked: old?.locked ?? false });
    }
    onSave({ ...traveler, budgetPerNight: budget, constraints });
  }

  return (
    <div className="cg-overlay cg-overlay--guide" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="cg-priority-dialog" role="dialog" aria-modal="true" aria-labelledby="priority-title">
        <button type="button" className="cg-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="cg-eyebrow"><SlidersHorizontal size={14} /> Personal decision profile</div>
        <h2 id="priority-title">What matters to {traveler.name}?</h2>
        <p className="cg-dialog-lead">Your answers become transparent scoring rules. CommonGround rewards options that satisfy everyone’s musts before balancing preferences.</p>
        <div className="cg-priority-legend">{PRIORITY_COPY.map((p) => <div key={p.value}><span className={`cg-priority cg-priority--${p.value}`}>{p.label}</span><small>{p.description}</small></div>)}</div>
        <label className="cg-budget-field"><span>Maximum nightly budget</span><strong>€{budget}</strong><input type="range" min={60} max={600} step={10} value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></label>
        <div className="cg-priority-options">
          {OPTIONS.map((option) => {
            const priority = selected[option.slug];
            return <div key={option.slug} className={`cg-priority-option ${priority ? "is-selected" : ""}`}>
              <button type="button" className="cg-option-toggle" onClick={() => toggle(option.slug, option.suggested)} aria-pressed={!!priority}><span className="cg-option-check">{priority && <Check size={14} />}</span><span>{option.label}</span></button>
              {priority && <select aria-label={`Priority for ${option.label}`} value={priority} onChange={(e) => setSelected((s) => ({ ...s, [option.slug]: e.target.value as Priority }))}>{PRIORITY_COPY.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select>}
            </div>;
          })}
        </div>
        <div className="cg-dialog-actions"><button type="button" className="cg-btn cg-btn--quiet" onClick={onClose}>Cancel</button><button type="button" className="cg-btn cg-btn--primary" onClick={save}>Save priorities</button></div>
      </section>
    </div>
  );
}
