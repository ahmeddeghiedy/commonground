"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import { ArrowRight, Bot, Check, Compass, Link2, Plus, RotateCcw, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, UserPlus, Users } from "lucide-react";
import { DemoGuide } from "./demo-guide";
import { CreateWorkspaceDialog } from "@/features/collaboration/create-workspace-dialog";
import { InviteTravelerDialog } from "@/features/collaboration/invite-traveler-dialog";
import { PriorityWizard } from "@/features/collaboration/priority-wizard";
import type { CollaborativeWorkspace, WorkspaceInvite, WorkspaceInviteStatus, WorkspaceRole } from "@/features/collaboration/types";
import { WorkspaceSettingsDialog } from "@/features/collaboration/workspace-settings-dialog";
import { WebMCPReadinessDialog } from "@/features/webmcp/webmcp-readiness-dialog";
import { InventorySourceDialog, type InventorySourceInfo } from "@/features/inventory/inventory-source-dialog";
import { WorkspaceOnboardingWizard } from "@/features/collaboration/workspace-onboarding-wizard";

type InventoryStatus = "loading" | "ready" | "fallback" | "error";
type CollaborationStatus = "demo" | "loading" | "ready" | "missing" | "error";
type SyncStatus = "idle" | "saving" | "saved" | "error";

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

export function Workspace({ workspaceId }: { workspaceId?: string }) {
  const [state, setState] = useState<WorkspaceState>(() => buildWorkspaceState());
  const [selectedScenarioId, setSelectedScenarioId] = useState<Scenario["id"]>("consensus");
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [vetoedHotelIds, setVetoedHotelIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState<InventoryStatus>("loading");
  const [showDemoGuide, setShowDemoGuide] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showInviteTraveler, setShowInviteTraveler] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [showWebMCPReadiness, setShowWebMCPReadiness] = useState(false);
  const [showInventorySource, setShowInventorySource] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [resumeOnboarding, setResumeOnboarding] = useState<"invite" | "priorities" | null>(null);
  const [editingTravelerId, setEditingTravelerId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("Demo workspace");
  const [accessToken, setAccessToken] = useState("");
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [currentTravelerId, setCurrentTravelerId] = useState<string | null>(null);
  const [collaborationStatus, setCollaborationStatus] = useState<CollaborationStatus>(workspaceId ? "loading" : "demo");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [travelerLimit, setTravelerLimit] = useState(4);
  const [inventoryRefresh, setInventoryRefresh] = useState(0);
  const [inventoryInfo, setInventoryInfo] = useState<InventorySourceInfo>({ id: "demo", name: "Curated challenge catalog", mode: "demo" });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef("");
  const suppressSaveRef = useRef(true);
  const promptedForPrioritiesRef = useRef(false);
  const workspaceVersionRef = useRef(1);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const applyCollaborativeWorkspace = useCallback((payload: CollaborativeWorkspace, token: string) => {
    setWorkspaceName(payload.name);
    workspaceVersionRef.current = payload.version;
    setRole(payload.role);
    setTravelerLimit(payload.travelerLimit);
    setCurrentTravelerId(payload.currentTravelerId ?? (payload.role === "owner" ? payload.state.travelers[0]?.id ?? null : null));
    setState((current) => ({
      ...payload.state,
      hotels: current.hotels,
      scenarios: generateScenarios(current.hotels, payload.state.travelers),
      conflicts: detectConflicts(payload.state.travelers),
    }));
    setAccessToken(token);
    setCollaborationStatus("ready");
    suppressSaveRef.current = true;
  }, []);

  const refreshWorkspace = useCallback(async (token = accessToken) => {
    if (!workspaceId || !token) return;
    const response = await fetch(`/api/workspaces/${workspaceId}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) throw new Error("Unable to open this workspace");
    applyCollaborativeWorkspace(await response.json() as CollaborativeWorkspace, token);
  }, [accessToken, applyCollaborativeWorkspace, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    const query = new URLSearchParams(window.location.search);
    const sharedToken = query.get("invite");
    if (query.get("onboarding") === "1") {
      setOnboardingStep(0);
      setShowOnboarding(true);
    }
    const key = `commonground:access:${workspaceId}`;
    let token = sharedToken ?? "";
    if (!token) { try { token = localStorage.getItem(key) ?? ""; } catch { /* access screen below */ } }
    if (sharedToken) {
      try { localStorage.setItem(key, sharedToken); } catch { /* token remains in memory */ }
      window.history.replaceState({}, "", `/w/${workspaceId}`);
    }
    if (!token) { setCollaborationStatus("missing"); return; }
    refreshWorkspace(token).catch(() => setCollaborationStatus("error"));
  }, [refreshWorkspace, workspaceId]);

  useEffect(() => {
    if (!workspaceId || !accessToken || collaborationStatus !== "ready") return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && syncStatus !== "saving") {
        refreshWorkspace().catch(() => undefined);
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [accessToken, collaborationStatus, refreshWorkspace, syncStatus, workspaceId]);

  useEffect(() => {
    if (collaborationStatus !== "ready" || role !== "traveler" || !currentTravelerId || promptedForPrioritiesRef.current) return;
    const ownProfile = state.travelers.find((traveler) => traveler.id === currentTravelerId);
    if (ownProfile?.constraints.length === 0) {
      promptedForPrioritiesRef.current = true;
      setEditingTravelerId(currentTravelerId);
    }
  }, [collaborationStatus, currentTravelerId, role, state.travelers]);

  const canEditTraveler = useCallback((travelerId: string) => (
    collaborationStatus === "demo" || role === "owner" || (role === "traveler" && travelerId === currentTravelerId)
  ), [collaborationStatus, currentTravelerId, role]);

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

  const openOnboarding = useCallback((step = 0) => {
    setOnboardingStep(Math.min(3, Math.max(0, step)));
    setShowOnboarding(true);
  }, []);

  const configureWorkspaceFromAgent = useCallback((input: { destination: string; checkIn: string; nights: number; travelerLimit: number }) => {
    setTravelerLimit(input.travelerLimit);
    setState((current) => ({
      ...current,
      destination: input.destination,
      checkIn: input.checkIn,
      nights: input.nights,
      activity: logActivity(current.activity, "agent", "constraint-update", `Agent configured ${input.destination} from ${input.checkIn}, ${input.nights} nights, capacity ${input.travelerLimit}`),
    }));
    openOnboarding(0);
    notify("Trip setup updated — review the guided next steps");
  }, [notify, openOnboarding]);

  const createWorkspaceFromAgent = useCallback(async (input: { name: string; destination: string; checkIn: string; nights: number; organizerName: string; travelerLimit: number }) => {
    const response = await fetch("/api/workspaces", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    const payload = await response.json() as { workspace?: { id: string }; ownerToken?: string; error?: string };
    if (!response.ok || !payload.workspace?.id || !payload.ownerToken) throw new Error(payload.error ?? "Workspace creation failed");
    try { localStorage.setItem(`commonground:access:${payload.workspace.id}`, payload.ownerToken); } catch { /* navigation carries token */ }
    const workspacePath = `/w/${payload.workspace.id}?invite=${encodeURIComponent(payload.ownerToken)}&onboarding=1`;
    notify("Workspace created by the agent — opening the guided setup");
    setTimeout(() => window.location.assign(workspacePath), 900);
    return { workspaceId: payload.workspace.id, workspacePath };
  }, [notify]);

  const listInvitationsFromAgent = useCallback(async (): Promise<WorkspaceInviteStatus[]> => {
    if (!workspaceId || !accessToken) throw new Error("No private workspace is open");
    const response = await fetch(`/api/workspaces/${workspaceId}/invites`, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const payload = await response.json() as { invitations?: WorkspaceInviteStatus[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Could not list invitations");
    return payload.invitations ?? [];
  }, [accessToken, workspaceId]);

  const createInvitationFromAgent = useCallback(async (input: { name: string; email?: string }) => {
    if (!workspaceId || !accessToken) throw new Error("No private workspace is open");
    const response = await fetch(`/api/workspaces/${workspaceId}/invites`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) });
    const payload = await response.json() as WorkspaceInvite & { error?: string };
    if (!response.ok || !payload.inviteToken) throw new Error(payload.error ?? "Could not create invitation");
    await refreshWorkspace();
    const inviteUrl = `${window.location.origin}/w/${workspaceId}?invite=${encodeURIComponent(payload.inviteToken)}`;
    notify(`Private invitation created for ${payload.travelerName} — review before sharing`);
    return { travelerId: payload.travelerId, travelerName: payload.travelerName, inviteUrl, shared: false };
  }, [accessToken, notify, refreshWorkspace, workspaceId]);

  const revokeInvitationFromAgent = useCallback(async (travelerId: string) => {
    if (!workspaceId || !accessToken) throw new Error("No private workspace is open");
    const response = await fetch(`/api/workspaces/${workspaceId}/invites`, { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ travelerId }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Could not revoke invitation");
    await refreshWorkspace();
    notify("Traveler removed and private invitation revoked");
  }, [accessToken, notify, refreshWorkspace, workspaceId]);

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
    collaboration: {
      mode: workspaceId ? "workspace" : "demo",
      workspaceId,
      workspaceName,
      role,
      currentTravelerId,
      maxTravelers: travelerLimit,
    },
    canEditTraveler,
    openCreateWorkspace: () => setShowCreateWorkspace(true),
    openInviteTraveler: () => setShowInviteTraveler(true),
    openWorkspaceSettings: () => setShowWorkspaceSettings(true),
    openWorkspaceOnboarding: openOnboarding,
    configureWorkspace: configureWorkspaceFromAgent,
    createWorkspace: createWorkspaceFromAgent,
    listInvitations: listInvitationsFromAgent,
    createInvitation: createInvitationFromAgent,
    revokeInvitation: revokeInvitationFromAgent,
    setWorkspaceCapacity: setTravelerLimit,
  });

  // Inventory load
  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ destination: state.destination, checkIn: state.checkIn, nights: String(state.nights), travelers: String(state.travelers.length) });
    fetch(`/api/inventory?${query}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: unknown) => {
        if (cancelled) return;
        const hotels = Array.isArray(data) ? data : (data as { hotels?: unknown[] })?.hotels;
        if (!Array.isArray(hotels) || !hotels.every(isHotel)) throw new Error("bad shape");
        setState((s) => {
          const next = { ...s, hotels: hotels as Hotel[] };
          return { ...next, scenarios: generateScenarios(next.hotels, next.travelers) };
        });
        const envelope = !Array.isArray(data) && data && typeof data === "object" ? data as { source?: unknown; provider?: { id?: unknown; name?: unknown; mode?: unknown }; fetchedAt?: unknown; fallbackReason?: unknown } : {};
        const mode = envelope.provider?.mode === "live" ? "live" : envelope.provider?.mode === "fallback" ? "fallback" : "demo";
        const source: InventoryStatus = mode === "live" ? "ready" : "fallback";
        setInventoryInfo({
          id: envelope.source === "wadjet" ? "wadjet" : envelope.source === "custom" ? "custom" : "demo",
          name: typeof envelope.provider?.name === "string" ? envelope.provider.name : "Curated challenge catalog",
          mode,
          fetchedAt: typeof envelope.fetchedAt === "string" ? envelope.fetchedAt : undefined,
          fallbackReason: typeof envelope.fallbackReason === "string" ? envelope.fallbackReason : undefined,
        });
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
  }, [inventoryRefresh, notify, state.checkIn, state.destination, state.nights, state.travelers.length]);

  const recalc = useCallback((travelers: WorkspaceState["travelers"], hotels: Hotel[]) => ({
    scenarios: generateScenarios(hotels, travelers),
    conflicts: detectConflicts(travelers),
  }), []);

  useEffect(() => {
    if (!workspaceId || !accessToken || collaborationStatus !== "ready") return;
    const payload = role === "owner"
      ? { version: workspaceVersionRef.current, state: { destination: state.destination, checkIn: state.checkIn, nights: state.nights, travelerLimit, travelers: state.travelers, activity: state.activity } }
      : { traveler: state.travelers.find((traveler) => traveler.id === currentTravelerId) };
    if ("traveler" in payload && !payload.traveler) return;
    const serialized = JSON.stringify(payload);
    if (suppressSaveRef.current) {
      suppressSaveRef.current = false;
      lastSavedRef.current = serialized;
      setSyncStatus("saved");
      return;
    }
    if (serialized === lastSavedRef.current) return;
    setSyncStatus("saving");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
          body: serialized,
        });
        if (!response.ok) {
          if (response.status === 409) await refreshWorkspace();
          throw new Error(response.status === 409 ? "Workspace changed elsewhere" : "Save failed");
        }
        const result = await response.json() as { version?: number };
        if (result.version) workspaceVersionRef.current = result.version;
        lastSavedRef.current = serialized;
        setSyncStatus("saved");
      } catch {
        setSyncStatus("error");
        notify("Changes could not be saved. The latest shared version has been loaded.");
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [accessToken, collaborationStatus, currentTravelerId, notify, refreshWorkspace, role, state.activity, state.checkIn, state.destination, state.nights, state.travelers, travelerLimit, workspaceId]);

  const handlePriorityChange = useCallback((travelerId: string, constraintId: string, priority: Priority) => {
    if (!canEditTraveler(travelerId)) { notify("You can edit only your own priorities"); return; }
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
  }, [canEditTraveler, notify, recalc]);

  const handleToggleLock = useCallback((travelerId: string, constraintId: string) => {
    if (!canEditTraveler(travelerId)) { notify("You can edit only your own priorities"); return; }
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
  }, [canEditTraveler, notify, recalc]);

  const savePriorityProfile = useCallback((updated: WorkspaceState["travelers"][number]) => {
    if (!canEditTraveler(updated.id)) return;
    setState((current) => {
      const travelers = current.travelers.map((traveler) => traveler.id === updated.id ? updated : traveler);
      return {
        ...current,
        travelers,
        ...recalc(travelers, current.hotels),
        activity: logActivity(current.activity, updated.id, "constraint-update", `${updated.name} saved ${updated.constraints.length} decision rules`),
      };
    });
    setEditingTravelerId(null);
    if (resumeOnboarding === "priorities") {
      setResumeOnboarding(null);
      setShowOnboarding(true);
    }
    notify("Priorities saved — the shortlist has been recalculated");
  }, [canEditTraveler, notify, recalc, resumeOnboarding]);


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

  if (workspaceId && collaborationStatus !== "ready") {
    const loading = collaborationStatus === "loading";
    return <div className="cg-app cg-access-page">
      <section className="cg-access-card">
        <span className="cg-logo" aria-hidden="true" />
        <div className="cg-eyebrow"><Link2 size={14} /> Private group workspace</div>
        <h1>{loading ? "Opening your trip…" : "This trip needs its private access link."}</h1>
        <p>{loading ? "Loading the travelers and their latest priorities." : collaborationStatus === "error" ? "This link is invalid, expired, or the workspace is unavailable. Ask the organizer to send your personal invite link again." : "Open the full link your organizer shared. Each traveler receives a different link so priorities stay safely scoped."}</p>
        {!loading && <div className="cg-access-actions"><Link className="cg-btn cg-btn--primary" href="/">Try the live demo</Link><button type="button" className="cg-btn" onClick={() => setShowCreateWorkspace(true)}>Create a new trip</button></div>}
      </section>
      {showCreateWorkspace && <CreateWorkspaceDialog onClose={() => setShowCreateWorkspace(false)} />}
    </div>;
  }

  return (
    <div className="cg-app">
      <header className="cg-header">
        <div className="cg-header-inner">
          <span className="cg-brand"><span className="cg-logo" aria-hidden="true" />CommonGround</span>
          <span className="cg-labs">TrailTrix Labs</span>
          <div className="cg-header-meta">
            <span>📍 {state.destination} · {state.checkIn} · {state.nights} nights</span>
            <button type="button" className={`cg-badge cg-badge-button ${badge.cls}`} onClick={() => setShowInventorySource(true)}><span className={`cg-dot ${badge.dot}`} />{badge.text}</button>
            <button type="button" className="cg-badge cg-badge-button" aria-label="WebMCP connection status" onClick={() => setShowWebMCPReadiness(true)}>
              <span className={`cg-dot ${webmcp.supported ? "cg-dot--ok" : "cg-dot--idle"}`} />
              {webmcp.supported ? `WebMCP · ${webmcp.registeredCount} tools` : "WebMCP ready · connect browser"}
            </button>
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
            <h1 id="product-title">{workspaceId ? `${state.travelers.length} of ${travelerLimit} travelers. One fair decision.` : "Different travelers. One decision everyone can live with."}</h1>
            <p>
              CommonGround turns competing budgets, accessibility needs and family preferences into
              a fair, auditable hotel decision—on the same live board humans and AI agents can use.
            </p>
            <div className="cg-hero-actions">
              {!workspaceId && <div className="cg-primary-cta-stack"><button type="button" className="cg-btn cg-btn--primary cg-btn--hero cg-btn--hero-primary" onClick={() => setShowCreateWorkspace(true)}>
                <Plus size={17} /> Create your trip workspace
              </button><small>Private · up to 30 travelers · ready in 2 minutes</small></div>}
              <button type="button" className={`cg-btn ${workspaceId ? "cg-btn--primary" : "cg-btn--quiet"} cg-btn--hero`} onClick={() => setShowDemoGuide(true)}>
                <Compass size={16} /> Run the 3-minute demo
              </button>
              {!workspaceId && <button type="button" className="cg-btn cg-btn--quiet cg-btn--hero" onClick={resetDemo}>
                <RotateCcw size={15} /> Reset workspace
              </button>}
            </div>
          </div>
          <div className="cg-command-card" aria-label="WebMCP control surface status">
            <div className="cg-command-head">
              <div><Bot size={18} /><span>Agent control surface</span></div>
              <span className={`cg-status-pill ${webmcp.supported ? "is-ready" : "is-off"}`}>
                {webmcp.supported ? "Native & connected" : "27 tools ready"}
              </span>
            </div>
            <div className="cg-command-metrics">
              <div><strong>{webmcp.supported ? webmcp.registeredCount : 27}</strong><span>strict tools</span></div>
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

        {!workspaceId && <section className="cg-start-journey" aria-label="How to start your group trip">
          <div><span>1</span><strong>Create the trip</strong><small>Destination, dates and group size</small></div>
          <i>→</i>
          <div><span>2</span><strong>Invite everyone</strong><small>One private link per traveler</small></div>
          <i>→</i>
          <div><span>3</span><strong>Decide fairly</strong><small>Priorities, live options and agent help</small></div>
          <button type="button" className="cg-btn cg-btn--primary" onClick={() => setShowCreateWorkspace(true)}>Start your workspace <ArrowRight size={15} /></button>
        </section>}

        <section className="cg-collaboration-bar" aria-label="Workspace collaboration status">
          <div className="cg-collab-identity"><span className="cg-collab-icon"><Users size={19} /></span><div><strong>{workspaceName}</strong><span>{workspaceId ? `${state.travelers.length} of ${travelerLimit} traveler seats` : `${state.travelers.length} sample decision profiles`}</span></div></div>
          <div className="cg-collab-explainer"><strong>{workspaceId ? "Every traveler owns their priorities." : "Ready to use this with your own group?"}</strong><span>{workspaceId ? "Musts are protected first; preferences shape the fairest remaining shortlist." : "Create a private workspace, invite up to 30 people, and follow the guided setup checklist."}</span></div>
          <div className="cg-collab-actions">
            {workspaceId && <span className={`cg-sync-status is-${syncStatus}`}>{syncStatus === "saving" ? "Saving…" : syncStatus === "error" ? "Save failed" : "Saved"}</span>}
            {workspaceId && role === "owner" && <button type="button" className="cg-btn" onClick={() => setShowWorkspaceSettings(true)}><Settings2 size={15} /> Group size</button>}
            {workspaceId && role === "owner" && <button type="button" className="cg-btn" disabled={state.travelers.length >= travelerLimit} onClick={() => setShowInviteTraveler(true)}><UserPlus size={15} /> Invite traveler</button>}
            {workspaceId && currentTravelerId && <button type="button" className="cg-btn cg-btn--primary" onClick={() => setEditingTravelerId(currentTravelerId)}><SlidersHorizontal size={15} /> My priorities</button>}
            {workspaceId && role === "owner" && <button type="button" className="cg-btn cg-btn--primary" onClick={() => openOnboarding(0)}><Sparkles size={15} /> Setup guide</button>}
            {!workspaceId && <button type="button" className="cg-btn cg-btn--primary" onClick={() => setShowCreateWorkspace(true)}><Plus size={15} /> Create your trip workspace</button>}
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
                  editable={canEditTraveler(t.id)}
                  onOpenPriorities={canEditTraveler(t.id) ? () => setEditingTravelerId(t.id) : undefined}
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

      {showCreateWorkspace && <CreateWorkspaceDialog onClose={() => setShowCreateWorkspace(false)} />}
      {showInviteTraveler && workspaceId && accessToken && (
        <InviteTravelerDialog
          workspaceId={workspaceId}
          accessToken={accessToken}
          currentCount={state.travelers.length}
          travelerLimit={travelerLimit}
          onClose={() => { setShowInviteTraveler(false); if (resumeOnboarding === "invite") { setResumeOnboarding(null); setShowOnboarding(true); } }}
          onInvited={() => refreshWorkspace()}
        />
      )}
      {showWorkspaceSettings && workspaceId && role === "owner" && (
        <WorkspaceSettingsDialog travelerLimit={travelerLimit} currentCount={state.travelers.length} onClose={() => setShowWorkspaceSettings(false)} onSave={setTravelerLimit} />
      )}
      {showWebMCPReadiness && <WebMCPReadinessDialog supported={webmcp.supported} toolCount={webmcp.registeredCount || 27} onClose={() => setShowWebMCPReadiness(false)} />}
      {showInventorySource && <InventorySourceDialog info={inventoryInfo} onClose={() => setShowInventorySource(false)} onRefresh={() => { setStatus("loading"); setInventoryRefresh((value) => value + 1); }} />}
      {showOnboarding && workspaceId && role === "owner" && currentTravelerId && (
        <WorkspaceOnboardingWizard
          step={onboardingStep}
          travelerCount={state.travelers.length}
          travelerLimit={travelerLimit}
          travelerName={state.travelers.find((traveler) => traveler.id === currentTravelerId)?.name ?? "your"}
          webmcpReady={webmcp.supported}
          onStepChange={setOnboardingStep}
          onInvite={() => { setResumeOnboarding("invite"); setOnboardingStep(1); setShowOnboarding(false); setShowInviteTraveler(true); }}
          onPriorities={() => { setResumeOnboarding("priorities"); setOnboardingStep(2); setShowOnboarding(false); setEditingTravelerId(currentTravelerId); }}
          onShowBoard={() => { setSelectedScenarioId("consensus"); setShowOnboarding(false); document.querySelector(".cg-col-board")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
          onCopyAgentPrompt={() => handlePrompt("Set up this CommonGround workspace for me. First read the collaboration status and workspace state. Then guide me step by step: confirm the destination, nights and traveler capacity; open the invitation step; help each traveler add priorities; search inventory; explain conflicts; and compare the three scenarios. Ask before every write and never purchase anything.")}
          onClose={() => setShowOnboarding(false)}
        />
      )}
      {editingTravelerId && state.travelers.find((traveler) => traveler.id === editingTravelerId) && (
        <PriorityWizard
          traveler={state.travelers.find((traveler) => traveler.id === editingTravelerId)!}
          onClose={() => setEditingTravelerId(null)}
          onSave={savePriorityProfile}
        />
      )}

      <div className="cg-toast-region" role="status" aria-live="polite">
        {toast && <div className="cg-toast">{toast}</div>}
      </div>
    </div>
  );
}

export default Workspace;
