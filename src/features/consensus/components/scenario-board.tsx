"use client";

import type { Scenario, ScoredHotel, Traveler } from "../types";

export interface ScenarioBoardProps {
  scenarios: Scenario[];
  inventoryCount: number;
  travelers: Traveler[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  selectedHotelId: string | null;
  onSelectHotel: (id: string) => void;
  vetoedHotelIds: string[];
  onVetoHotel: (id: string) => void;
}

function HotelCard({
  scored,
  travelers,
  selected,
  vetoed,
  onSelect,
  onVeto,
}: {
  scored: ScoredHotel;
  travelers: Traveler[];
  selected: boolean;
  vetoed: boolean;
  onSelect: () => void;
  onVeto: () => void;
}) {
  const { hotel } = scored;
  return (
    <article
      className={`cg-hotel${selected ? " cg-hotel--selected" : ""}${vetoed ? " cg-hotel--vetoed" : ""}`}
      aria-label={`${hotel.name}, ${hotel.nightlyPrice} per night`}
    >
      <div className="cg-hotel-art" style={{ background: hotel.imageGradient }} aria-hidden="true" />
      <div className="cg-hotel-body">
        <div>
          <div className="cg-hotel-name">{hotel.name}</div>
          <div className="cg-hotel-meta">
            <span>📍 {hotel.location} · {hotel.distanceKm}km</span>
            <span>★ {hotel.rating} · {hotel.reviewScore}/10</span>
            <span>{hotel.roomsAvailable} rooms left</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="cg-hotel-price">€{hotel.totalPrice} total</span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>€{hotel.nightlyPrice}/night</span>
        </div>
        <div className="cg-hotel-amenities">{hotel.amenities.join(" · ")}</div>
        <div className="cg-meter" aria-hidden="true">
          <div className="cg-meter-fill" style={{ width: `${scored.totalScore}%` }} />
        </div>
        <div className="cg-mini-scores">
          {travelers.map((t) => {
            const s = scored.travelerScores[t.id] ?? 0;
            return (
              <span
                key={t.id}
                className={`cg-mini-score${s < 50 ? " cg-mini-score--low" : ""}`}
                title={`${t.name}: ${s}/100`}
              >
                {t.name.split(" ")[0]} {s}
              </span>
            );
          })}
        </div>
        {scored.violations.slice(0, 2).map((v) => (
          <div key={v} className="cg-violation">⚠ {v}</div>
        ))}
        <div className="cg-hotel-actions">
          <button type="button" className="cg-btn cg-btn--primary" onClick={onSelect} aria-pressed={selected}>
            {selected ? "Selected ✓" : "Select"}
          </button>
          <button
            type="button"
            className={`cg-btn cg-btn--danger${vetoed ? " cg-btn--vetoed" : ""}`}
            onClick={onVeto}
            aria-pressed={vetoed}
            aria-label={`${vetoed ? "Remove veto on" : "Veto"} ${hotel.name}`}
          >
            {vetoed ? "Vetoed" : "Veto"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ScenarioBoard(props: ScenarioBoardProps) {
  const scenario =
    props.scenarios.find((s) => s.id === props.selectedScenarioId) ?? props.scenarios[0];
  if (!scenario) return null;
  return (
    <section className="cg-panel" aria-label="Scenario board">
      <div role="tablist" aria-label="Scenarios" className="cg-tabs">
        {props.scenarios.map((s) => (
          <button
            key={s.id}
            role="tab"
            id={`tab-${s.id}`}
            aria-selected={s.id === scenario.id}
            aria-controls="scenario-panel"
            className="cg-tab"
            onClick={() => props.onSelectScenario(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div id="scenario-panel" role="tabpanel" aria-labelledby={`tab-${scenario.id}`}>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>{scenario.description}</p>
        <p className="cg-inventory-context" role="status">
          Showing {scenario.hotels.length} ranked {scenario.hotels.length === 1 ? "option" : "options"} from {props.inventoryCount} hotels loaded.
        </p>
        <div className="cg-meter-row">
          <span>Consensus meter</span>
          <span>{scenario.fairness}/100 fairness</span>
        </div>
        <div
          className="cg-meter"
          role="meter"
          aria-valuenow={scenario.fairness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${scenario.label} fairness score`}
        >
          <div className="cg-meter-fill" style={{ width: `${scenario.fairness}%` }} />
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)" }}>{scenario.rationale}</p>
        <div className="cg-hotel-grid">
          {scenario.hotels
            .filter((h) => !props.vetoedHotelIds.includes(h.hotel.id))
            .concat(scenario.hotels.filter((h) => props.vetoedHotelIds.includes(h.hotel.id)))
            .map((scored) => (
              <HotelCard
                key={scored.hotel.id}
                scored={scored}
                travelers={props.travelers}
                selected={props.selectedHotelId === scored.hotel.id}
                vetoed={props.vetoedHotelIds.includes(scored.hotel.id)}
                onSelect={() => props.onSelectHotel(scored.hotel.id)}
                onVeto={() => props.onVetoHotel(scored.hotel.id)}
              />
            ))}
        </div>
      </div>
    </section>
  );
}
