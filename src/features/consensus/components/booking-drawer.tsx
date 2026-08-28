"use client";

import type { BookingDraft } from "../types";

export interface BookingDrawerProps {
  draft: BookingDraft;
  hotelName: string;
  onClose: () => void;
  onApprove: () => void;
}

export function BookingDrawer({ draft, hotelName, onClose, onApprove }: BookingDrawerProps) {
  return (
    <div
      className="cg-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="cg-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
      >
        <h2 id="booking-title">Approve booking draft</h2>
        <p className="cg-drawer-note">
          This creates an <strong>approved draft only</strong> — no purchase is made.
        </p>
        <dl style={{ fontSize: 14, lineHeight: 1.8, margin: "12px 0" }}>
          <div><dt style={{ display: "inline", color: "var(--muted)" }}>Hotel: </dt><dd style={{ display: "inline" }}>{hotelName}</dd></div>
          <div><dt style={{ display: "inline", color: "var(--muted)" }}>Nights: </dt><dd style={{ display: "inline" }}>{draft.nights}</dd></div>
          <div><dt style={{ display: "inline", color: "var(--muted)" }}>Travelers: </dt><dd style={{ display: "inline" }}>{draft.travelerIds.length}</dd></div>
          <div><dt style={{ display: "inline", color: "var(--muted)" }}>Total: </dt><dd style={{ display: "inline" }}>{draft.currency} {draft.totalPrice}</dd></div>
          <div><dt style={{ display: "inline", color: "var(--muted)" }}>Scenario: </dt><dd style={{ display: "inline" }}>{draft.scenarioId}</dd></div>
        </dl>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="cg-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="cg-btn cg-btn--primary" onClick={onApprove} autoFocus>
            Approve draft
          </button>
        </div>
      </div>
    </div>
  );
}
