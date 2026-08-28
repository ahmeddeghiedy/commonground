"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Activity,
  BookingDraft,
  Hotel,
  Priority,
  Scenario,
  WorkspaceState,
} from "../types";
import { buildWorkspaceState, generateScenarios, detectConflicts } from "../scoring";
import { TravelerCard } from "./traveler-card";
import { ScenarioBoard } from "./scenario-board";
import { AgentRail } from "./agent-rail";
import { BookingDrawer } from "./booking-drawer";
import { useCommonGroundWebMCP } from "@/features/webmcp/use-common-ground-webmcp";
import { Bot, Check, Compass, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { DemoGuide } from "./demo-guide";

type InventoryStatus = "loading" | "ready" | "fallback" | "error";

function isHotel(v: unknown): v is Hotel {
  if (!v || typeof v !== "object") return false;
  const h = v as Record<string, unknown>;
  return (
    typeof h.id === "string" &&
    typeof h.name === "string" &&
    typeof h.nightlyPrice === "number" &&
    typeof h.totalPrice === "number" &&
    Array.isArray(h.amenities)
  );
}

function logActivity(prev: Activity[], actorId: string, kind: Activity["kind"], detail: string): Activity[] {
  const entry: Activity = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actorId,
    kind,
    detail,
    at: new Date().toISOString(),
  };
  return [entry, ...prev].slice(0, 30);
}

export function Workspace() {
  const [state, setState] = useState<WorkspaceState>(() => buildWorkspaceState());
  const [selectedScenarioId, setSelectedScenarioId] = useState<Scenario["id"]>("consensus");
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [vetoedHotelIds, setVetoedHotelIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState<InventoryStatus>("loading");
  const [showDemoGuide, setShowDemoGuide] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const openBookingDraft = useCallback((hotelId?: string) => {
    const resolvedHotelId = hotelId ?? selectedHotelId;
    if (!resolvedHotelId) return;
    const hotel = state.hotels.find((h) => h.id === resolvedHotelId);
    if (!hotel) return;
    setDraft({
      id: `draft-${Date.now()}`,
      hotelId: hotel.id,
      scenarioId: selectedScenarioId,
      travelerIds: state.travelers.map((t) => t.id),
      nights: state.nights,
      totalPrice: hotel.totalPrice,
      currency: hotel.currency,
      status: "draft",
      createdAt: new Date().toISOString(),
    });
  }, [selectedHotelId, selectedScenarioId, state.hotels, state.travelers, state.nights]);

  const webmcp = useCommonGroundWebMCP({
    state,
    setState,
    selectedScenarioId,
    setSelectedScenarioId,
    selectedHotelId,
    setSelectedHotelId,
    vetoedHotelIds,
    setVetoedHotelIds,
    openBookingDraft,
  });

  // Inventory load
  useEffect(() => {
    let cancelled = false;
    fetch("/api/inventory")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: unknown) => {
        if (cancelled) return;
        const hotels = Array.isArray(data) ? data : (data as { hotels?: unknown[] })?.hotels;
        if (!Array.isArray(hotels) || !hotels.every(isHotel)) throw new Error("bad shape");
        setState((s) => {
          const next = { ...s, hotels: hotels as Hotel[] };
          return { ...next, scenarios: generateScenarios(next.hotels, next.travelers) };
        });
        const source =
          !Array.isArray(data) &&
          data &&
          typeof data === "object" &&
          (data as { source?: unknown }).source === "trailtrix"
            ? "ready"
            : "fallback";
        setStatus(source);
        notify(
          source === "ready"
            ? "Live inventory loaded"
            : "Reliable demo inventory loaded"
        );
      })
      .catch(() => {
        if (cancelled) return;
        setStatus((s) => (s === "loading" ? "error" : s));
        if (!cancelled) notify("Inventory unavailable — using demo data");
      });
    return () => { cancelled = true; };
  }, [notify]);

  const recalc = useCallback((travelers: WorkspaceState["travelers"], hotels: Hotel[]) => ({
    scenarios: generateScenarios(hotels, travelers),
    conflicts: detectConflicts(travelers),
  }), []);

  const handlePriorityChange = useCallback((travelerId: string, constraintId: string, priority: Priority) => {
    setState((s) => {
      const travelers = s.travelers.map((t) =>
        t.id === travelerId
          ? { ...t, constraints: t.constraints.map((c) => (c.id === constraintId ? { ...c, priority } : c)) }
          : t
      );
      const traveler = travelers.find((t) => t.id === travelerId);
      const label = traveler?.constraints.find((c) => c.id === constraintId)?.label ?? constraintId;
      return {
        ...s,
        travelers,
        ...recalc(travelers, s.hotels),
        activity: logActivity(s.activity, travelerId, "constraint-update", `Priority for "${label}" changed to ${priority}`),
      };
    });
    notify(`Priority updated — scenarios recalculated`);
  }, [notify, recalc]);

  const handleToggleLock = useCallback((travelerId: string, constraintId: string) => {
    setState((s) => {
      const travelers = s.travelers.map((t) =>
        t.id === travelerId
          ? { ...t, constraints: t.constraints.map((c) => (c.id === constraintId ? { ...c, locked: !c.locked } : c)) }
          : t
      );
      const c = travelers.find((t) => t.id === travelerId)?.constraints.find((x) => x.id === constraintId);
      return {
        ...s,
        travelers,
        ...recalc(travelers, s.hotels),
        activity: logActivity(s.activity, travelerId, "constraint-update", `${c?.locked ? "Locked" : "Unlocked"} "${c?.label ?? constraintId}"`),
      };
    });
    notify("Lock status updated");
  }, [notify, recalc]);

  const handleVeto = useCallback((hotelId: string) => {
    setVetoedHotelIds((prev) =>
      prev.includes(hotelId) ? prev.filter((id) => id !== hotelId) : [...prev, hotelId]
    );
    const hotel = state.hotels.find((h) => h.id === hotelId);
    notify(hotel ? `${hotel.name} veto toggled — scenarios updated` : "Veto toggled");
    setSelectedHotelId((cur) => (cur === hotelId ? null : cur));
  }, [notify, state.hotels]);

  const handlePrompt = useCallback(async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      notify("Agent prompt copied — paste it into your WebMCP-enabled agent");
    } catch {
      notify("Copy unavailable — select the prompt manually");
    }
  }, [notify]);

  const resetDemo = useCallback(() => {
    setState((current) => {
      const fresh = buildWorkspaceState();
      return {
        ...fresh,
        hotels: current.hotels,
        scenarios: generateScenarios(current.hotels, fresh.travelers),
      };
    });
    setSelectedScenarioId("consensus");
    setSelectedHotelId(null);
    setVetoedHotelIds([]);
    setDraft(null);
    notify("Demo reset to a clean, deterministic state");
  }, [notify]);

  const approveDraft = useCallback(() => {
    if (!draft) return;
    const approved: BookingDraft = { ...draft, status: "approved" };
    setDraft(approved);
    setState((s) => ({
      ...s,
      activity: logActivity(s.activity, "agent", "approve", `Draft approved for ${s.hotels.find((h) => h.id === approved.hotelId)?.name ?? "hotel"} — no purchase made`),
    }));
    notify("Booking draft approved — no purchase made");
    setTimeout(() => setDraft(null), 900);
  }, [draft, notify]);

  const scenarioHotels = useMemo(
    () => state.scenarios.find((s) => s.id === selectedScenarioId)?.hotels ?? [],
    [state.scenarios, selectedScenarioId]
  );

  const liveScenarios = useMemo(
    () => state.scenarios.map((s) => ({ ...s, hotels: s.hotels.filter((h) => !vetoedHotelIds.includes(h.hotel.id)) })),
    [state.scenarios, vetoedHotelIds]
  );

  const badge =
    status === "ready" ? { cls: "cg-badge--live", dot: "cg-dot--ok", text: "Live inventory" } :
    status === "loading" ? { cls: "cg-badge--live", dot: "cg-dot--idle", text: "Loading…" } :
    status === "error" ? { cls: "cg-badge--demo", dot: "cg-dot--off", text: "Demo inventory (error)" } :
    { cls: "cg-badge--demo", dot: "cg-dot--idle", text: "Demo inventory" };

  return (
    <div className="cg-app">
      <header className="cg-header">
        <div className="cg-header-inner">
          <span className="cg-brand"><span className="cg-logo" aria-hidden="true" />CommonGround</span>
          <span className="cg-labs">TrailTrix Labs</span>
          <div className="cg-header-meta">
            <span>📍 {state.destination} · {state.nights} nights</span>
            <span className={`cg-badge ${badge.cls}`}><span className={`cg-dot ${badge.dot}`} />{badge.text}</span>
            <span className="cg-badge" aria-label="WebMCP status">
              <span className={`cg-dot ${webmcp.supported ? "cg-dot--ok" : "cg-dot--off"}`} />
              {webmcp.supported ? `WebMCP · ${webmcp.registeredCount} tools` : "WebMCP off"}
            </span>
          </div>
        </div>
      </header>

      <main className="cg-container">
        {status === "loading" && <div className="cg-banner cg-banner--loading" role="status">Loading live inventory…</div>}
        {status === "error" && (
          <div className="cg-banner cg-banner--error" role="alert">
            Couldn&apos;t load live inventory. Falling back to demo data — the demo continues normally.
          </div>
        )}

        <section className="cg-hero" aria-labelledby="product-title">
          <div className="cg-hero-copy">
            <div className="cg-eyebrow"><Sparkles size={14} /> WebMCP-native group travel</div>
            <h1 id="product-title">Four travelers. One decision everyone can live with.</h1>
            <p>
              CommonGround turns competing budgets, accessibility needs and family preferences into
              a fair, auditable hotel decision—on the same live board humans and AI agents can use.
            </p>
            <div className="cg-hero-actions">
              <button type="button" className="cg-btn cg-btn--primary cg-btn--hero" onClick={() => setShowDemoGuide(true)}>
                <Compass size={16} /> Run the 3-minute demo
              </button>
              <button type="button" className="cg-btn cg-btn--quiet cg-btn--hero" onClick={resetDemo}>
                <RotateCcw size={15} /> Reset workspace
              </button>
            </div>
          </div>
          <div className="cg-command-card" aria-label="WebMCP control surface status">
            <div className="cg-command-head">
              <div><Bot size={18} /><span>Agent control surface</span></div>
              <span className={`cg-status-pill ${webmcp.supported ? "is-ready" : "is-off"}`}>
                {webmcp.supported ? "Native & ready" : "Enable WebMCP"}
              </span>
            </div>
            <div className="cg-command-metrics">
              <div><strong>{webmcp.supported ? webmcp.registeredCount : 11}</strong><span>strict tools</span></div>
              <div><strong>100%</strong><span>visible writes</span></div>
              <div><strong>0</strong><span>autonomous purchases</span></div>
            </div>
            <div className="cg-safety-line"><ShieldCheck size={15} /> Human approval is the final gate</div>
            <div className="cg-tool-flow">
              <span><Check size={12} /> Read</span><i />
              <span><Check size={12} /> Reason</span><i />
              <span><Check size={12} /> Act</span><i />
              <span className="is-guarded"><ShieldCheck size={12} /> Approve</span>
            </div>
          </div>
        </section>

        <div className="cg-grid">
          <div className="cg-col-people">
            <section className="cg-panel" aria-label="People and priorities">
              <h2 className="cg-panel-title">People &amp; priorities</h2>
              {state.travelers.map((t) => (
                <TravelerCard
                  key={t.id}
                  traveler={t}
                  onPriorityChange={handlePriorityChange}
                  onToggleLock={handleToggleLock}
                />
              ))}
            </section>
          </div>

          <div className="cg-col-board">
            <ScenarioBoard
              scenarios={liveScenarios}
              travelers={state.travelers}
              selectedScenarioId={selectedScenarioId}
              onSelectScenario={(id) => {
                setSelectedScenarioId(id as Scenario["id"]);
                setState((s) => ({ ...s, activity: logActivity(s.activity, "agent", "scenario-view", `Viewed ${id} scenario`) }));
                notify("Scenario switched");
              }}
              selectedHotelId={selectedHotelId}
              onSelectHotel={(id) => { setSelectedHotelId(id); notify("Hotel selected"); }}
              vetoedHotelIds={vetoedHotelIds}
              onVetoHotel={handleVeto}
            />
          </div>

          <div className="cg-col-rail">
            <AgentRail
              conflicts={state.conflicts}
              travelers={state.travelers}
              scenarios={liveScenarios}
              selectedScenarioId={selectedScenarioId}
              activity={state.activity}
              onPrompt={handlePrompt}
              onPrepareBooking={openBookingDraft}
              canPrepareBooking={!!selectedHotelId && scenarioHotels.some((h) => h.hotel.id === selectedHotelId)}
            />
          </div>
        </div>
      </main>

      {draft && (
        <BookingDrawer
          draft={draft}
          hotelName={state.hotels.find((h) => h.id === draft.hotelId)?.name ?? "Selected hotel"}
          onClose={() => setDraft(null)}
          onApprove={approveDraft}
        />
      )}

      {showDemoGuide && (
        <DemoGuide
          webmcpReady={webmcp.supported}
          toolCount={webmcp.registeredCount}
          onClose={() => setShowDemoGuide(false)}
          onCopyPrompt={handlePrompt}
        />
      )}

      <div className="cg-toast-region" role="status" aria-live="polite">
        {toast && <div className="cg-toast">{toast}</div>}
      </div>
    </div>
  );
}

export default Workspace;
