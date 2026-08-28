"use client";

import type { Activity, Conflict, Scenario, Traveler } from "../types";

export interface AgentRailProps {
  conflicts: Conflict[];
  travelers: Traveler[];
  scenarios: Scenario[];
  selectedScenarioId: string;
  activity: Activity[];
  onPrompt: (prompt: string) => void;
  onPrepareBooking: () => void;
  canPrepareBooking: boolean;
}

const PROMPTS = [
  "Where are we losing Maya's satisfaction?",
  "Find a hotel under €150 with a pool",
  "What's the fairest option for everyone?",
];

export function AgentRail(props: AgentRailProps) {
  const scenario = props.scenarios.find((s) => s.id === props.selectedScenarioId);
  const top = scenario?.hotels[0];
  return (
    <>
      <section className="cg-panel" aria-label="Detected conflicts">
        <h3 className="cg-panel-title">Conflicts detected</h3>
        {props.conflicts.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--muted)" }}>No active conflicts — smooth sailing.</p>
        )}
        {props.conflicts.map((c) => (
          <div key={c.id} className={`cg-conflict cg-conflict--${c.severity}`}>
            <div>{c.description}</div>
            <div className="cg-suggestion">💡 {c.suggestedResolution}</div>
          </div>
        ))}
      </section>

      <section className="cg-panel" aria-label="Satisfaction matrix">
        <h3 className="cg-panel-title">Satisfaction matrix</h3>
        {scenario && top ? (
          <table className="cg-matrix">
            <caption className="cg-drawer-note" style={{ captionSide: "top", textAlign: "left", paddingBottom: 6 }}>
              Top pick in {scenario.label}: {top.hotel.name}
            </caption>
            <thead>
              <tr><th scope="col">Traveler</th><th scope="col">Score</th></tr>
            </thead>
            <tbody>
              {props.travelers.map((t) => (
                <tr key={t.id}>
                  <th scope="row">{t.name}</th>
                  <td>{top.travelerScores[t.id] ?? 0}/100</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)" }}>No scenario data.</p>
        )}
      </section>

      <section className="cg-panel" aria-label="Recent agent activity">
        <h3 className="cg-panel-title">Agent activity</h3>
        {props.activity.slice(0, 8).map((a) => (
          <div key={a.id} className="cg-activity-item">{a.detail}</div>
        ))}
      </section>

      <section className="cg-panel" aria-label="Ask the agent">
        <h3 className="cg-panel-title">Ask the agent</h3>
        {PROMPTS.map((p) => (
          <button key={p} type="button" className="cg-btn cg-prompt-btn" onClick={() => props.onPrompt(p)}>
            “{p}”
          </button>
        ))}
        <button
          type="button"
          className="cg-btn cg-btn--primary"
          style={{ width: "100%" }}
          disabled={!props.canPrepareBooking}
          onClick={props.onPrepareBooking}
        >
          Prepare booking draft
        </button>
        {!props.canPrepareBooking && (
          <p className="cg-drawer-note" style={{ marginTop: 8 }}>Select a hotel first.</p>
        )}
      </section>
    </>
  );
}
