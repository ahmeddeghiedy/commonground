"use client";

import type { Priority, Traveler } from "../types";

const PRIORITIES: Priority[] = ["must", "prefer", "flexible", "exclude"];

export interface TravelerCardProps {
  traveler: Traveler;
  onPriorityChange: (travelerId: string, constraintId: string, priority: Priority) => void;
  onToggleLock: (travelerId: string, constraintId: string) => void;
}

export function TravelerCard({ traveler, onPriorityChange, onToggleLock }: TravelerCardProps) {
  const initials = traveler.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <article className="cg-traveler" aria-label={`${traveler.name}, budget ${traveler.budgetPerNight} euro per night`}>
      <div className="cg-traveler-head">
        <span
          className="cg-avatar"
          style={{ background: `hsl(${traveler.avatarHue}, 65%, 70%)` }}
          aria-hidden="true"
        >
          {initials}
        </span>
        <div>
          <div className="cg-traveler-name">{traveler.name}</div>
          <div className="cg-traveler-budget">€{traveler.budgetPerNight}/night budget</div>
        </div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
        {traveler.constraints.map((c) => (
          <li key={c.id} className="cg-constraint">
            <span className="cg-constraint-label">{c.label}</span>
            {c.locked && <span className="cg-lock-flag" role="img" aria-label="locked">🔒</span>}
            <button
              type="button"
              className={`cg-priority cg-priority--${c.priority}`}
              aria-label={`${traveler.name}: change priority for ${c.label}, currently ${c.priority}`}
              disabled={c.locked}
              onClick={() => {
                const next = PRIORITIES[(PRIORITIES.indexOf(c.priority) + 1) % PRIORITIES.length];
                onPriorityChange(traveler.id, c.id, next);
              }}
              style={c.locked ? { cursor: "not-allowed", opacity: 0.5 } : undefined}
            >
              {c.priority}
            </button>
            <button
              type="button"
              className="cg-lock-btn"
              aria-pressed={c.locked}
              aria-label={`${c.locked ? "Unlock" : "Lock"} constraint ${c.label} for ${traveler.name}`}
              onClick={() => onToggleLock(traveler.id, c.id)}
            >
              {c.locked ? "Unlock" : "Lock"}
            </button>
          </li>
        ))}
      </ul>
    </article>
  );
}
