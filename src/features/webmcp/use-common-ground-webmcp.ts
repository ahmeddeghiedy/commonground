"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Activity,
  Constraint,
  Hotel,
  Priority,
  Scenario,
  WorkspaceState,
} from "../consensus/types";
import { detectConflicts, generateScenarios } from "../consensus/scoring";
import type { WorkspaceRole } from "../collaboration/types";
import type {
  WebMCPJsonSchema,
  WebMCPModelContext,
  WebMCPToolAnnotations,
} from "./webmcp-types";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

export interface CommonGroundWebMCPProps {
  state: WorkspaceState;
  setState: Setter<WorkspaceState>;
  selectedScenarioId: Scenario["id"];
  setSelectedScenarioId: Setter<Scenario["id"]>;
  selectedHotelId: string | null;
  setSelectedHotelId: Setter<string | null>;
  vetoedHotelIds: string[];
  setVetoedHotelIds: Setter<string[]>;
  openBookingDraft: (hotelId?: string, scenarioId?: Scenario["id"]) => void;
  collaboration: {
    mode: "demo" | "workspace";
    workspaceId?: string;
    workspaceName: string;
    role: WorkspaceRole | null;
    currentTravelerId: string | null;
    maxTravelers: number;
  };
  canEditTraveler: (travelerId: string) => boolean;
  openCreateWorkspace: () => void;
  openInviteTraveler: () => void;
  openWorkspaceSettings: () => void;
  openWorkspaceOnboarding: (step?: number) => void;
  configureWorkspace: (input: { destination: string; checkIn: string; nights: number; travelerLimit: number }) => void;
  createWorkspace: (input: { name: string; destination: string; checkIn: string; nights: number; organizerName: string; travelerLimit: number }) => Promise<{ workspaceId: string; workspacePath: string }>;
  listInvitations: () => Promise<unknown[]>;
  createInvitation: (input: { name: string; email?: string }) => Promise<Record<string, unknown>>;
  revokeInvitation: (travelerId: string) => Promise<void>;
  setWorkspaceCapacity: (travelerLimit: number) => void;
}

export interface CommonGroundWebMCPStatus {
  supported: boolean;
  registeredCount: number;
  invocationCount: number;
  lastInvocation: {
    name: string;
    status: "running" | "completed" | "rejected" | "failed";
    at: string;
  } | null;
}

const PRIORITIES: Priority[] = ["must", "prefer", "flexible", "exclude"];
const SCENARIO_IDS: Scenario["id"][] = ["consensus", "value", "compromise"];
const CONSTRAINT_CATEGORIES: Constraint["category"][] = ["accessibility", "family", "amenity", "location", "budget", "cancellation", "rating"];

function schema(properties: Record<string, unknown>, required: string[]): WebMCPJsonSchema {
  return { type: "object", properties, required, additionalProperties: false };
}

const str = (desc: string) => ({ type: "string", description: desc });
const enum_ = <T extends string>(desc: string, values: T[]) => ({
  type: "string",
  enum: values,
  description: `${desc} One of: ${values.join(", ")}.`,
});

function ok(payload: Record<string, unknown> = {}) {
  return { success: true, ...payload };
}
function fail(error: string, hint?: string) {
  return { success: false, error, ...(hint ? { hint } : {}) };
}

interface LocalToolOptions {
  description: string;
  inputSchema: WebMCPJsonSchema;
  annotations?: WebMCPToolAnnotations;
  execute: (args: unknown, signal: AbortSignal) => Promise<unknown> | unknown;
}

/**
 * Registers CommonGround workspace tools with the browser's WebMCP model context.
 * No-op (no error) when document.modelContext is unavailable.
 * Handlers always read current state/actions through refs; registration runs once.
 */
export function useCommonGroundWebMCP(props: CommonGroundWebMCPProps): CommonGroundWebMCPStatus {
  const [status, setStatus] = useState<CommonGroundWebMCPStatus>({
    supported: false,
    registeredCount: 0,
    invocationCount: 0,
    lastInvocation: null,
  });
  const propsRef = useRef(props);
  propsRef.current = props;
  const activitySeq = useRef(0);

  useEffect(() => {
    const mc: WebMCPModelContext | undefined =
      typeof document !== "undefined"
        ? document.modelContext
        : undefined;
    if (!mc || typeof mc.registerTool !== "function") {
// Legacy navigator alias would go here; intentionally NOT used (deprecated).
      setStatus({ supported: false, registeredCount: 0, invocationCount: 0, lastInvocation: null });
      return;
    }

    const controller = new AbortController();
    let count = 0;

    const nextActivityId = () => `act-webmcp-${Date.now()}-${(activitySeq.current += 1)}`;

    const logActivity = (
      prev: Activity[],
      kind: Activity["kind"],
      detail: string
    ): Activity[] => [
      { id: nextActivityId(), actorId: "agent", kind, detail, at: new Date().toISOString() },
      ...prev,
    ].slice(0, 30);

    const recalc = (travelers: WorkspaceState["travelers"], hotels: Hotel[]) => ({
      scenarios: generateScenarios(hotels, travelers),
      conflicts: detectConflicts(travelers),
    });

    const requireString = (v: unknown): string | null =>
      typeof v === "string" && v.length > 0 ? v : null;

    const register = (name: string, options: LocalToolOptions) => {
      try {
        void mc.registerTool(
          {
            name,
            title: name
              .split("_")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(" "),
            description: options.description,
            inputSchema: options.inputSchema,
            annotations: {
              readOnlyHint: options.annotations?.readOnlyHint ?? false,
              untrustedContentHint:
                options.annotations?.untrustedContentHint ?? false,
            },
            execute: async (args, executionOptions) => {
              const at = new Date().toISOString();
              setStatus((current) => ({
                ...current,
                invocationCount: current.invocationCount + 1,
                lastInvocation: { name, status: "running", at },
              }));
              try {
                const result = await options.execute(
                  args,
                  executionOptions?.signal ?? new AbortController().signal
                );
                const rejected = Boolean(
                  result && typeof result === "object" &&
                  "success" in result && (result as { success?: unknown }).success === false
                );
                setStatus((current) => ({
                  ...current,
                  lastInvocation: { name, status: rejected ? "rejected" : "completed", at },
                }));
                return result;
              } catch (error) {
                setStatus((current) => ({
                  ...current,
                  lastInvocation: { name, status: "failed", at },
                }));
                throw error;
              }
            },
          },
          { signal: controller.signal }
        ).catch(() => {
          setStatus((current) => ({
            ...current,
            registeredCount: Math.max(0, current.registeredCount - 1),
          }));
        });
        count += 1;
      } catch {
        /* individual tool registration failure is non-fatal */
      }
    };

    const P = propsRef;

    const ownerRequired = () => P.current.collaboration.mode === "workspace" && P.current.collaboration.role !== "owner";

    // ---------- READ TOOLS ----------

    register("get_collaboration_status", {
      description: "Read whether this is a sample demo or a durable private workspace, the current access role, traveler capacity, and which traveler profile the current visitor can edit. Use before collaboration or mutation actions.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: true },
      execute: async () => {
        const c = P.current.collaboration;
        return ok({
          mode: c.mode,
          workspaceId: c.workspaceId ?? null,
          workspaceName: c.workspaceName,
          role: c.role ?? "demo-user",
          currentTravelerId: c.currentTravelerId,
          travelerCount: P.current.state.travelers.length,
          maxTravelers: c.maxTravelers,
          canInvite: c.mode === "workspace" && c.role === "owner" && P.current.state.travelers.length < c.maxTravelers,
          accessModel: "The organizer can manage the workspace and invites. Each invited traveler can edit only their own priority profile.",
          nextAction: c.mode === "demo" ? "Use open_workspace_setup to let the human create a private trip." : "Use list_travelers_and_constraints to inspect decision profiles.",
        });
      },
    });

    register("get_workspace_state", {
      description:
        "Read the full shared trip workspace: travelers, their constraints and priorities, current scenarios, conflicts, and recent activity. Use first to orient before any other CommonGround tool.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: true },
      execute: async () => {
        const s = P.current.state;
        const c = P.current.collaboration;
        return ok({
          workspace: {
            id: c.workspaceId ?? null,
            name: c.workspaceName,
            mode: c.mode,
            role: c.role ?? "demo-user",
          },
          snapshotAt: new Date().toISOString(),
          destination: s.destination,
          checkIn: s.checkIn,
          nights: s.nights,
          travelers: s.travelers.map((t) => ({
            id: t.id,
            name: t.name,
            budgetPerNight: t.budgetPerNight,
            constraints: t.constraints.map((c) => ({
              id: c.id, label: c.label, category: c.category, priority: c.priority, locked: c.locked,
            })),
          })),
          hotels: s.hotels.map((hotel) => ({
            id: hotel.id,
            name: hotel.name,
            nightlyPrice: hotel.nightlyPrice,
            totalPrice: hotel.totalPrice,
            reviewScore: hotel.reviewScore,
            cancellation: hotel.cancellation,
            amenities: hotel.amenities,
            roomsAvailable: hotel.roomsAvailable,
          })),
          vetoedHotelIds: P.current.vetoedHotelIds,
          selectedScenarioId: P.current.selectedScenarioId,
          selectedHotelId: P.current.selectedHotelId,
          conflictCount: s.conflicts.length,
          activityCount: s.activity.length,
          recentActivity: s.activity.slice(0, 10),
          nextAction: "Call list_travelers_and_constraints or search_hotel_inventory for detail.",
        });
      },
    });

    register("list_travelers_and_constraints", {
      description:
        "List each traveler with their per-night budget and all constraints (label, category, priority, locked). Use when weighing whose needs conflict or before changing priorities/locks.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: true },
      execute: async () => {
        const s = P.current.state;
        return ok({
          travelers: s.travelers.map((t) => ({
            id: t.id, name: t.name, budgetPerNight: t.budgetPerNight,
            constraints: t.constraints,
          })),
          conflicts: s.conflicts,
          nextAction: "Use explain_conflicts for plain-language trade-offs.",
        });
      },
    });

    register("search_hotel_inventory", {
      description:
        "Query the live hotel inventory API (/api/inventory) and return normalized structured hotel data (price, rating, cancellation policy, amenities, distance, availability). Read-only; use whenever the group asks what hotels exist or match a budget.",
      inputSchema: schema({
        maxTotalPrice: { type: "number", description: "Optional cap on total price for the stay." },
        minReviewScore: { type: "number", description: "Optional minimum review score (0-10)." },
      }, []),
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (args, signal) => {
        const a = (args ?? {}) as Record<string, unknown>;
        const maxTotalPrice = typeof a.maxTotalPrice === "number" ? a.maxTotalPrice : undefined;
        const minReviewScore = typeof a.minReviewScore === "number" ? a.minReviewScore : undefined;
        try {
          const current = P.current.state;
          const query = new URLSearchParams({ destination: current.destination, checkIn: current.checkIn, nights: String(current.nights), travelers: String(current.travelers.length) });
          const res = await fetch(`/api/inventory?${query}`, { signal });
          if (!res.ok) return fail(`inventory HTTP ${res.status}`, "Falling back: use hotels from get_workspace_state.");
          const data = (await res.json()) as unknown;
          const raw = Array.isArray(data) ? data : (data as { hotels?: unknown[] })?.hotels;
          if (!Array.isArray(raw)) return fail("inventory returned unexpected shape");
          const hotels = raw
            .filter((h): h is Hotel => !!h && typeof h === "object" &&
              typeof (h as Hotel).id === "string" && typeof (h as Hotel).name === "string" &&
              typeof (h as Hotel).nightlyPrice === "number" && Array.isArray((h as Hotel).amenities))
            .filter((h) => maxTotalPrice === undefined || h.totalPrice <= maxTotalPrice)
            .filter((h) => minReviewScore === undefined || h.reviewScore >= minReviewScore)
            .map((h) => ({
              id: h.id, name: h.name, location: h.location, nightlyPrice: h.nightlyPrice,
              totalPrice: h.totalPrice, currency: h.currency, rating: h.rating,
              reviewScore: h.reviewScore, cancellation: h.cancellation,
              amenities: h.amenities, distanceKm: h.distanceKm, roomsAvailable: h.roomsAvailable,
            }));
          return ok({
            count: hotels.length,
            provider: !Array.isArray(data) && data && typeof data === "object" ? (data as { provider?: unknown }).provider ?? null : null,
            hotels,
            nextAction: "Call compare_scenarios to see how these rank for this specific group.",
          });
        } catch (e) {
          if (signal.aborted) return fail("aborted");
          return fail(`inventory fetch failed: ${String(e)}`);
        }
      },
    });

    register("compare_scenarios", {
      description:
        "Compare the three generated scenarios (consensus, value, compromise): top hotels, fairness, rationale, and per-traveler scores. Use when the group asks which option is best or fairest.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: true },
      execute: async () => {
        const s = P.current.state;
        const vetoed = new Set(P.current.vetoedHotelIds);
        return ok({
          scenarios: s.scenarios.map((sc) => ({
            id: sc.id, label: sc.label, description: sc.description, fairness: sc.fairness,
            rationale: sc.rationale,
            hotels: sc.hotels
              .filter((h) => !vetoed.has(h.hotel.id))
              .map((h) => ({
                hotelId: h.hotel.id, name: h.hotel.name, totalPrice: h.hotel.totalPrice,
                totalScore: h.totalScore, travelerScores: h.travelerScores,
                violations: h.violations,
              })),
          })),
          currentlySelected: P.current.selectedScenarioId,
          nextAction: "Suggest select_scenario to switch the visible board, or veto_hotel to remove an option.",
        });
      },
    });

    register("explain_conflicts", {
      description:
        "Explain conflicts between travelers (budget gaps, opposing amenity preferences) with severity and suggested resolutions, plus which constraints are locked. Use before proposing compromises.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: true },
      execute: async () => {
        const s = P.current.state;
        const name = (id: string) => s.travelers.find((t) => t.id === id)?.name ?? id;
        return ok({
          conflicts: s.conflicts.map((c) => ({
            ...c,
            travelerNames: c.travelerIds.map(name),
          })),
          lockedConstraints: s.travelers.flatMap((t) =>
            t.constraints.filter((c) => c.locked).map((c) => ({
              travelerId: t.id,
              travelerName: t.name,
              budgetPerNight: t.budgetPerNight,
              constraintId: c.id,
              label: c.label,
              category: c.category,
              priority: c.priority,
            }))
          ),
          nextAction: "Propose set_constraint_priority or lock_constraint changes the humans can approve.",
        });
      },
    });

    register("get_onboarding_status", {
      description: "Read setup progress for the current workspace: capacity, invitations or traveler seats, completed priority profiles, inventory readiness, and whether a scenario and hotel are selected.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: true },
      execute: async () => {
        const s = P.current.state;
        const completedProfiles = s.travelers.filter((traveler) => traveler.constraints.length > 0).length;
        return ok({
          workspaceCreated: P.current.collaboration.mode === "workspace",
          travelerCount: s.travelers.length,
          travelerLimit: P.current.collaboration.maxTravelers,
          completedPriorityProfiles: completedProfiles,
          incompletePriorityProfiles: s.travelers.filter((traveler) => traveler.constraints.length === 0).map((traveler) => ({ id: traveler.id, name: traveler.name })),
          inventoryLoaded: s.hotels.length > 0,
          selectedScenarioId: P.current.selectedScenarioId,
          selectedHotelId: P.current.selectedHotelId,
          nextAction: P.current.collaboration.mode !== "workspace" ? "Create a private workspace." : s.travelers.length < P.current.collaboration.maxTravelers ? "Invite the remaining travelers or continue with current group." : completedProfiles < s.travelers.length ? "Complete the remaining traveler profiles." : "Compare scenarios and select a hotel.",
        });
      },
    });

    // ---------- WRITE TOOLS ----------

    register("open_workspace_setup", {
      description: "Open the visible, human-controlled form for creating a durable private trip workspace. This tool does not submit or create anything itself; the human reviews the trip name, destination, nights, and organizer name.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: false },
      execute: async () => {
        P.current.openCreateWorkspace();
        return ok({ workspaceCreated: false, changed: { setupDialogOpened: true }, nextAction: "Ask the human to complete and submit the visible workspace form." });
      },
    });

    register("create_workspace", {
      description: "Create a durable private CommonGround workspace from confirmed trip details, save organizer access in this browser, and navigate to the guided setup. State-changing; confirm all values with the human before calling.",
      inputSchema: schema({
        name: str("Workspace name, 2 to 80 characters."),
        destination: str("Destination, 2 to 120 characters."),
        checkIn: str("Check-in date in YYYY-MM-DD format."),
        nights: { type: "integer", minimum: 1, maximum: 30, description: "Length of stay." },
        organizerName: str("Organizer name, 1 to 60 characters."),
        travelerLimit: { type: "integer", minimum: 2, maximum: 30, description: "Traveler seats including organizer." },
      }, ["name", "destination", "checkIn", "nights", "organizerName", "travelerLimit"]),
      execute: async (args) => {
        if (P.current.collaboration.mode === "workspace") return fail("A private workspace is already open.");
        const a = (args ?? {}) as Record<string, unknown>;
        const input = {
          name: typeof a.name === "string" ? a.name.trim() : "",
          destination: typeof a.destination === "string" ? a.destination.trim() : "",
          checkIn: typeof a.checkIn === "string" ? a.checkIn : "",
          nights: typeof a.nights === "number" ? a.nights : 0,
          organizerName: typeof a.organizerName === "string" ? a.organizerName.trim() : "",
          travelerLimit: typeof a.travelerLimit === "number" ? a.travelerLimit : 0,
        };
        if (input.name.length < 2 || input.destination.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(input.checkIn) || !Number.isInteger(input.nights) || input.nights < 1 || input.nights > 30 || !input.organizerName || !Number.isInteger(input.travelerLimit) || input.travelerLimit < 2 || input.travelerLimit > 30) return fail("invalid workspace details", "Confirm the name, destination, date, 1–30 nights, organizer, and 2–30 seats.");
        try {
          const created = await P.current.createWorkspace(input);
          return ok({ changed: { workspaceCreated: true, ...created }, nextAction: "Continue in the new workspace and create traveler invitations." });
        } catch (error) { return fail(String(error)); }
      },
    });

    register("open_invite_traveler", {
      description: "Open the visible organizer-only invitation form. It creates no invitation until the human enters a name and submits; CommonGround then produces a private traveler-scoped link for manual sharing.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: false },
      execute: async () => {
        const c = P.current.collaboration;
        if (c.mode !== "workspace") return fail("No private workspace is open", "Use open_workspace_setup first.");
        if (c.role !== "owner") return fail("Only the organizer can invite travelers.");
        if (P.current.state.travelers.length >= c.maxTravelers) return fail(`This workspace already has the maximum ${c.maxTravelers} travelers.`);
        P.current.openInviteTraveler();
        return ok({ inviteCreated: false, changed: { inviteDialogOpened: true }, nextAction: "Ask the organizer to complete the visible form and copy the generated private link." });
      },
    });

    register("list_invitations", {
      description: "List organizer-visible traveler invitations and their invited or active status. Does not expose private invite tokens.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: true },
      execute: async () => {
        if (ownerRequired() || P.current.collaboration.mode !== "workspace") return fail("Only the organizer of a private workspace can list invitations.");
        try { return ok({ invitations: await P.current.listInvitations(), nextAction: "Create another invitation or revoke an unused link if requested." }); }
        catch (error) { return fail(String(error)); }
      },
    });

    register("create_invitation", {
      description: "Create one private traveler-scoped invitation link. Organizer-only. Returns the link for human review and manual sharing; never sends email, WhatsApp, or any external message automatically.",
      inputSchema: schema({ name: str("Traveler name."), email: str("Optional email address stored with the invitation; no message is sent.") }, ["name"]),
      execute: async (args) => {
        if (ownerRequired() || P.current.collaboration.mode !== "workspace") return fail("Only the organizer of a private workspace can create invitations.");
        if (P.current.state.travelers.length >= P.current.collaboration.maxTravelers) return fail("Workspace traveler capacity has been reached.");
        const a = (args ?? {}) as Record<string, unknown>;
        const name = typeof a.name === "string" ? a.name.trim() : "";
        const email = typeof a.email === "string" ? a.email.trim() : undefined;
        if (!name || name.length > 60) return fail("invalid traveler name");
        try { return ok({ changed: await P.current.createInvitation({ name, ...(email ? { email } : {}) }), nextAction: "Show the private link to the organizer and ask them to share it with only that traveler." }); }
        catch (error) { return fail(String(error)); }
      },
    });

    register("revoke_invitation", {
      description: "Remove an invited traveler and permanently invalidate their private access link. Organizer-only and destructive; require explicit human confirmation before calling.",
      inputSchema: schema({ travelerId: str("Traveler invitation to revoke, from list_invitations.") }, ["travelerId"]),
      execute: async (args) => {
        if (ownerRequired() || P.current.collaboration.mode !== "workspace") return fail("Only the organizer can revoke invitations.");
        const travelerId = requireString((args as Record<string, unknown> | null)?.travelerId);
        if (!travelerId) return fail("travelerId is required");
        try { await P.current.revokeInvitation(travelerId); return ok({ changed: { travelerId, invitationRevoked: true, travelerRemoved: true }, nextAction: "Refresh collaboration status before creating another invitation." }); }
        catch (error) { return fail(String(error)); }
      },
    });

    register("open_workspace_settings", {
      description: "Open the visible organizer-only workspace settings where the human can adjust the planned traveler capacity between 2 and 30. This tool never changes the limit itself.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: false },
      execute: async () => {
        const c = P.current.collaboration;
        if (c.mode !== "workspace") return fail("No private workspace is open", "Use open_workspace_setup first.");
        if (c.role !== "owner") return fail("Only the organizer can change workspace capacity.");
        P.current.openWorkspaceSettings();
        return ok({ changed: { workspaceSettingsOpened: true }, nextAction: "Ask the organizer to review the visible capacity control and choose Done." });
      },
    });

    register("open_workspace_onboarding", {
      description: "Open the visible organizer setup guide at the requested step: invite travelers, choose predefined priorities, compare scenarios, or connect an agent. Use this to guide a human through the workspace without making hidden changes.",
      inputSchema: schema({
        step: enum_("Wizard step to open.", ["invite", "priorities", "compare", "agent"]),
      }, []),
      annotations: { readOnlyHint: false },
      execute: async (args) => {
        const c = P.current.collaboration;
        if (c.mode !== "workspace") return fail("No private workspace is open", "Use open_workspace_setup first.");
        if (c.role !== "owner") return fail("Only the organizer can open the group setup guide.");
        const requested = (args as { step?: unknown } | null)?.step;
        const stepIndex = requested === "priorities" ? 1 : requested === "compare" ? 2 : requested === "agent" ? 3 : 0;
        P.current.openWorkspaceOnboarding(stepIndex);
        return ok({ changed: { onboardingOpened: true, step: ["invite", "priorities", "compare", "agent"][stepIndex] }, nextAction: "Guide the organizer through the visible step, then continue with the relevant CommonGround tool." });
      },
    });

    register("configure_trip_workspace", {
      description: "Configure an existing private workspace's destination, number of nights, and traveler capacity, then open the visible setup guide. Organizer-only and immediately visible. Confirm the values with the organizer before calling.",
      inputSchema: schema({
        destination: str("Destination name, 2 to 120 characters."),
        checkIn: str("Check-in date in YYYY-MM-DD format."),
        nights: { type: "integer", minimum: 1, maximum: 30, description: "Length of stay in nights." },
        travelerLimit: { type: "integer", minimum: 2, maximum: 30, description: "Total traveler seats, including the organizer." },
      }, ["destination", "checkIn", "nights", "travelerLimit"]),
      annotations: { readOnlyHint: false },
      execute: async (args) => {
        const c = P.current.collaboration;
        if (c.mode !== "workspace") return fail("No private workspace is open", "Use open_workspace_setup first.");
        if (c.role !== "owner") return fail("Only the organizer can configure the trip workspace.");
        const a = (args ?? {}) as Record<string, unknown>;
        const destination = typeof a.destination === "string" ? a.destination.trim() : "";
        const checkIn = typeof a.checkIn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.checkIn) ? a.checkIn : "";
        const nights = typeof a.nights === "number" && Number.isInteger(a.nights) ? a.nights : 0;
        const travelerLimit = typeof a.travelerLimit === "number" && Number.isInteger(a.travelerLimit) ? a.travelerLimit : 0;
        if (destination.length < 2 || destination.length > 120 || !checkIn || nights < 1 || nights > 30 || travelerLimit < 2 || travelerLimit > 30) return fail("invalid trip configuration", "Use a destination, check-in date, 1–30 nights, and 2–30 traveler seats.");
        if (travelerLimit < P.current.state.travelers.length) return fail("traveler capacity is below the current group size", `Choose at least ${P.current.state.travelers.length} seats.`);
        P.current.configureWorkspace({ destination, checkIn, nights, travelerLimit });
        return ok({ changed: { destination, checkIn, nights, travelerLimit, onboardingOpened: true }, nextAction: "Use open_invite_traveler or continue the visible onboarding guide." });
      },
    });

    register("set_workspace_capacity", {
      description: "Set traveler capacity between 2 and 30 for an existing private workspace. Organizer-only and visible; cannot reduce below the current traveler count.",
      inputSchema: schema({ travelerLimit: { type: "integer", minimum: 2, maximum: 30, description: "New total seat capacity." } }, ["travelerLimit"]),
      execute: async (args) => {
        if (ownerRequired() || P.current.collaboration.mode !== "workspace") return fail("Only the organizer can change capacity.");
        const value = (args as { travelerLimit?: unknown } | null)?.travelerLimit;
        if (typeof value !== "number" || !Number.isInteger(value) || value < 2 || value > 30) return fail("travelerLimit must be an integer from 2 to 30");
        if (value < P.current.state.travelers.length) return fail("capacity cannot be below current traveler count");
        P.current.setWorkspaceCapacity(value);
        return ok({ changed: { travelerLimit: value }, nextAction: "Call get_collaboration_status to confirm available seats." });
      },
    });

    register("update_traveler_profile", {
      description: "Update an authorized traveler's display name and/or maximum nightly budget. Visible and permission-scoped; recalculates scenarios. Ask the traveler before changing values.",
      inputSchema: schema({ travelerId: str("Traveler to update."), name: str("Optional new display name."), budgetPerNight: { type: "number", minimum: 20, maximum: 5000, description: "Optional nightly budget in euros." } }, ["travelerId"]),
      execute: async (args) => {
        const a = (args ?? {}) as Record<string, unknown>;
        const travelerId = requireString(a.travelerId);
        if (!travelerId || !P.current.canEditTraveler(travelerId)) return fail("You can edit only an authorized traveler profile.");
        const traveler = P.current.state.travelers.find((item) => item.id === travelerId);
        if (!traveler) return fail("traveler not found");
        const name = typeof a.name === "string" ? a.name.trim() : traveler.name;
        const budget = typeof a.budgetPerNight === "number" ? a.budgetPerNight : traveler.budgetPerNight;
        if (!name || name.length > 60 || budget < 20 || budget > 5000) return fail("invalid profile values");
        P.current.setState((s) => {
          const travelers = s.travelers.map((item) => item.id === travelerId ? { ...item, name, budgetPerNight: budget, constraints: item.constraints.map((constraint) => constraint.category === "budget" ? { ...constraint, label: `Under €${budget}/night` } : constraint) } : item);
          return { ...s, travelers, ...recalc(travelers, s.hotels), activity: logActivity(s.activity, "constraint-update", `Agent updated ${name}'s traveler profile`) };
        });
        return ok({ changed: { travelerId, name, budgetPerNight: budget }, nextAction: "Review the updated profile and compare scenarios." });
      },
    });

    register("add_constraint", {
      description: "Add a decision constraint to an authorized traveler profile. Visible and permission-scoped; recalculates scenarios. Confirm label, category, and priority with the traveler.",
      inputSchema: schema({ travelerId: str("Traveler to update."), label: str("Constraint label."), category: enum_("Constraint category.", CONSTRAINT_CATEGORIES), priority: enum_("Priority.", PRIORITIES), locked: { type: "boolean", description: "Whether the new rule is locked." } }, ["travelerId", "label", "category", "priority"]),
      execute: async (args) => {
        const a = (args ?? {}) as Record<string, unknown>;
        const travelerId = requireString(a.travelerId); const label = requireString(a.label);
        const category = CONSTRAINT_CATEGORIES.includes(a.category as Constraint["category"]) ? a.category as Constraint["category"] : null;
        const priority = PRIORITIES.includes(a.priority as Priority) ? a.priority as Priority : null;
        if (!travelerId || !label || !category || !priority || !P.current.canEditTraveler(travelerId)) return fail("invalid or unauthorized constraint");
        const traveler = P.current.state.travelers.find((item) => item.id === travelerId);
        if (!traveler) return fail("traveler not found");
        if (traveler.constraints.length >= 20) return fail("traveler already has the maximum 20 constraints");
        if (traveler.constraints.some((constraint) => constraint.label.toLowerCase() === label.toLowerCase())) return fail("constraint already exists");
        const constraint: Constraint = { id: `c-${travelerId}-${crypto.randomUUID()}`, label: label.slice(0, 120), category, priority, weight: priority === "must" ? 1.25 : 1, locked: typeof a.locked === "boolean" ? a.locked : priority === "must" };
        P.current.setState((s) => { const travelers = s.travelers.map((item) => item.id === travelerId ? { ...item, constraints: [...item.constraints, constraint] } : item); return { ...s, travelers, ...recalc(travelers, s.hotels), activity: logActivity(s.activity, "constraint-add", `Agent added "${constraint.label}" for ${traveler.name}`) }; });
        return ok({ changed: { travelerId, constraint }, nextAction: "Compare scenarios to show the effect." });
      },
    });

    register("remove_constraint", {
      description: "Remove an unlocked constraint from an authorized traveler profile. Destructive and visible; require explicit traveler confirmation. Locked constraints must be unlocked first.",
      inputSchema: schema({ travelerId: str("Owning traveler."), constraintId: str("Constraint to remove.") }, ["travelerId", "constraintId"]),
      execute: async (args) => {
        const a = (args ?? {}) as Record<string, unknown>; const travelerId = requireString(a.travelerId); const constraintId = requireString(a.constraintId);
        if (!travelerId || !constraintId || !P.current.canEditTraveler(travelerId)) return fail("invalid or unauthorized constraint");
        const traveler = P.current.state.travelers.find((item) => item.id === travelerId); const constraint = traveler?.constraints.find((item) => item.id === constraintId);
        if (!traveler || !constraint) return fail("traveler or constraint not found");
        if (constraint.locked) return fail("constraint is locked", "Unlock it first with lock_constraint after traveler confirmation.");
        P.current.setState((s) => { const travelers = s.travelers.map((item) => item.id === travelerId ? { ...item, constraints: item.constraints.filter((rule) => rule.id !== constraintId) } : item); return { ...s, travelers, ...recalc(travelers, s.hotels), activity: logActivity(s.activity, "constraint-update", `Agent removed "${constraint.label}" for ${traveler.name}`) }; });
        return ok({ changed: { travelerId, constraintId, removed: true }, nextAction: "Compare scenarios to show the effect." });
      },
    });

    register("set_constraint_priority", {
      description:
        "Change one traveler's constraint priority (must/prefer/flexible/exclude). State-changing: updates the visible board, recalculates scenarios, and logs activity. Ask the traveler first when ambiguous.",
      inputSchema: schema({
        travelerId: str("Traveler to update, e.g. from list_travelers_and_constraints."),
        constraintId: str("Constraint to change."),
        priority: enum_("New priority.", PRIORITIES),
      }, ["travelerId", "constraintId", "priority"]),
      annotations: { readOnlyHint: false },
      execute: async (args) => {
        const a = (args ?? {}) as Record<string, unknown>;
        const travelerId = requireString(a.travelerId);
        const constraintId = requireString(a.constraintId);
        const priority = PRIORITIES.includes(a.priority as Priority) ? (a.priority as Priority) : null;
        if (!travelerId || !constraintId || !priority)
          return fail("invalid arguments", "Need travelerId, constraintId, priority in {must,prefer,flexible,exclude}.");
        if (!P.current.canEditTraveler(travelerId)) return fail("You can edit only your own traveler profile.", "Call get_collaboration_status for the current travelerId.");
        const t = P.current.state.travelers.find((x) => x.id === travelerId);
        const c = t?.constraints.find((x) => x.id === constraintId);
        if (!t || !c) return fail("traveler or constraint not found", "Call list_travelers_and_constraints for valid IDs.");
        if (c.locked) return fail(`"${c.label}" is locked by ${t.name}`, "Ask them to unlock via lock_constraint first.");
        P.current.setState((s) => {
          const travelers = s.travelers.map((x) =>
            x.id === travelerId
              ? { ...x, constraints: x.constraints.map((y) => (y.id === constraintId ? { ...y, priority } : y)) }
              : x
          );
          return {
            ...s, travelers, ...recalc(travelers, s.hotels),
            activity: logActivity(s.activity, "constraint-update", `Agent set "${c.label}" for ${t.name} to ${priority}`),
          };
        });
        return ok({
          changed: { travelerId, constraintId, priority },
          nextAction: "Call compare_scenarios to show the human the recalculated options.",
        });
      },
    });

    register("lock_constraint", {
      description:
        "Lock or unlock one traveler's constraint. A locked constraint cannot have its priority changed until the owner unlocks it. State-changing: recalculates scenarios and logs activity. Confirm with the owning traveler.",
      inputSchema: schema({
        travelerId: str("Owning traveler ID."),
        constraintId: str("Constraint to lock/unlock."),
        locked: { type: "boolean", description: "True to lock (default true)." },
      }, ["travelerId", "constraintId"]),
      annotations: { readOnlyHint: false },
      execute: async (args) => {
        const a = (args ?? {}) as Record<string, unknown>;
        const travelerId = requireString(a.travelerId);
        const constraintId = requireString(a.constraintId);
        const locked = typeof a.locked === "boolean" ? a.locked : true;
        if (!travelerId || !constraintId) return fail("invalid arguments");
        if (!P.current.canEditTraveler(travelerId)) return fail("You can edit only your own traveler profile.", "Call get_collaboration_status for the current travelerId.");
        const t = P.current.state.travelers.find((x) => x.id === travelerId);
        const c = t?.constraints.find((x) => x.id === constraintId);
        if (!t || !c) return fail("traveler or constraint not found");
        P.current.setState((s) => {
          const travelers = s.travelers.map((x) =>
            x.id === travelerId
              ? { ...x, constraints: x.constraints.map((y) => (y.id === constraintId ? { ...y, locked } : y)) }
              : x
          );
          return {
            ...s, travelers, ...recalc(travelers, s.hotels),
            activity: logActivity(s.activity, "constraint-update", `Agent ${locked ? "locked" : "unlocked"} "${c.label}" for ${t.name}`),
          };
        });
        return ok({
          changed: { travelerId, constraintId, locked },
          nextAction: "Call compare_scenarios to reflect the protected constraint.",
        });
      },
    });

    register("veto_hotel", {
      description:
        "Veto (remove) a hotel from all scenarios, or un-veto it. State-changing and visible on the board; logs activity. Only veto when a traveler explicitly rejects the hotel.",
      inputSchema: schema({
        hotelId: str("Hotel to veto/un-veto."),
        vetoed: { type: "boolean", description: "True to veto (default toggles)." },
      }, ["hotelId"]),
      annotations: { readOnlyHint: false },
      execute: async (args) => {
        if (ownerRequired()) return fail("Only the organizer can veto group options.");
        const a = (args ?? {}) as Record<string, unknown>;
        const hotelId = requireString(a.hotelId);
        if (!hotelId) return fail("invalid arguments", "hotelId is required.");
        const hotel = P.current.state.hotels.find((h) => h.id === hotelId);
        if (!hotel) return fail("hotel not found", "Call search_hotel_inventory for valid IDs.");
        const target = typeof a.vetoed === "boolean"
          ? a.vetoed
          : !P.current.vetoedHotelIds.includes(hotelId);
        P.current.setVetoedHotelIds((prev) =>
          target ? (prev.includes(hotelId) ? prev : [...prev, hotelId]) : prev.filter((id) => id !== hotelId)
        );
        if (target) P.current.setSelectedHotelId((cur) => (cur === hotelId ? null : cur));
        P.current.setState((s) => ({
          ...s,
          activity: logActivity(s.activity, "constraint-update", `Agent ${target ? "vetoed" : "un-vetoed"} ${hotel.name}`),
        }));
        return ok({
          changed: { hotelId, vetoed: target },
          nextAction: "Call compare_scenarios to show the remaining options.",
        });
      },
    });

    register("create_scenarios", {
      description:
        "Regenerate the three scenarios (consensus/value/compromise) from current travelers, constraints, and hotels. Use after several constraint changes to refresh rankings; logs activity.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: false },
      execute: async () => {
        if (ownerRequired()) return fail("Only the organizer can regenerate group scenarios.");
        P.current.setState((s) => ({
          ...s,
          ...recalc(s.travelers, s.hotels),
          activity: logActivity(s.activity, "scenario-view", "Agent regenerated scenarios from current constraints"),
        }));
        return ok({
          changed: { scenarios: SCENARIO_IDS },
          nextAction: "Call compare_scenarios to summarize the refreshed board.",
        });
      },
    });

    register("select_scenario", {
      description:
        "Switch the visible scenario board to consensus, value, or compromise. State-changing and visible in the UI; logs activity.",
      inputSchema: schema({ scenarioId: enum_("Scenario to show.", SCENARIO_IDS) }, ["scenarioId"]),
      annotations: { readOnlyHint: false },
      execute: async (args) => {
        if (ownerRequired()) return fail("Only the organizer can change the shared scenario view.");
        const a = (args ?? {}) as Record<string, unknown>;
        const scenarioId = SCENARIO_IDS.includes(a.scenarioId as Scenario["id"])
          ? (a.scenarioId as Scenario["id"]) : null;
        if (!scenarioId) return fail("invalid scenarioId", `Must be one of ${SCENARIO_IDS.join(", ")}.`);
        P.current.setSelectedScenarioId(scenarioId);
        P.current.setState((s) => ({
          ...s,
          activity: logActivity(s.activity, "scenario-view", `Agent switched view to ${scenarioId} scenario`),
        }));
        return ok({
          changed: { selectedScenarioId: scenarioId },
          nextAction: "Summarize the top hotels with compare_scenarios.",
        });
      },
    });

    register("select_hotel", {
      description: "Select or clear a hotel on the visible board without preparing a booking draft. Organizer-only for private workspaces; cannot select a vetoed hotel.",
      inputSchema: schema({ hotelId: str("Hotel to select. Pass 'none' to clear selection.") }, ["hotelId"]),
      execute: async (args) => {
        if (ownerRequired()) return fail("Only the organizer can change the shared hotel selection.");
        const hotelId = requireString((args as Record<string, unknown> | null)?.hotelId);
        if (!hotelId) return fail("hotelId is required");
        if (hotelId === "none") { P.current.setSelectedHotelId(null); return ok({ changed: { selectedHotelId: null } }); }
        const hotel = P.current.state.hotels.find((item) => item.id === hotelId);
        if (!hotel) return fail("hotel not found");
        if (P.current.vetoedHotelIds.includes(hotelId)) return fail("hotel is vetoed");
        P.current.setSelectedHotelId(hotelId);
        P.current.setState((s) => ({ ...s, activity: logActivity(s.activity, "scenario-view", `Agent selected ${hotel.name}`) }));
        return ok({ changed: { selectedHotelId: hotelId, hotelName: hotel.name }, nextAction: "Prepare a booking draft only if the humans ask." });
      },
    });

    register("prepare_booking_draft", {
      description:
        "Open a human-confirmation booking draft UI for a hotel. Does NOT book, purchase, or charge anything — it only surfaces a draft the humans must approve. Optionally sets hotel/scenario first.",
      inputSchema: schema({
        hotelId: str("Hotel to draft. Defaults to the currently selected hotel."),
        scenarioId: enum_("Optional scenario context.", SCENARIO_IDS),
      }, []),
      annotations: { readOnlyHint: false },
      execute: async (args) => {
        if (ownerRequired()) return fail("Only the organizer can prepare a group booking draft.");
        const a = (args ?? {}) as Record<string, unknown>;
        const hotelId = requireString(a.hotelId) ?? P.current.selectedHotelId;
        if (!hotelId) return fail("no hotel selected", "Pass hotelId or have a human select a hotel first.");
        const hotel = P.current.state.hotels.find((h) => h.id === hotelId);
        if (!hotel) return fail("hotel not found");
        if (P.current.vetoedHotelIds.includes(hotelId))
          return fail("hotel is vetoed", "Un-veto via veto_hotel first, or pick another hotel.");
        const scenarioId = SCENARIO_IDS.includes(a.scenarioId as Scenario["id"])
          ? (a.scenarioId as Scenario["id"]) : null;
        if (scenarioId) P.current.setSelectedScenarioId(scenarioId);
        P.current.setSelectedHotelId(hotelId);
        P.current.setState((s) => ({
          ...s,
          activity: logActivity(s.activity, "approve", `Agent prepared a booking draft for ${hotel.name} — awaiting human confirmation; no purchase occurred`),
        }));
        P.current.openBookingDraft(hotelId, scenarioId ?? P.current.selectedScenarioId);
        return ok({
          changed: {
            draftOpenedFor: hotel.name,
            hotelId,
            scenarioId: scenarioId ?? P.current.selectedScenarioId,
          },
          purchaseOccurred: false,
          nextAction: "Tell the humans to review and approve/reject the draft in the drawer. No purchase occurred.",
        });
      },
    });

    setStatus((current) => ({ ...current, supported: true, registeredCount: count }));

    return () => {
      controller.abort();
    };
  }, []);

  return status;
}

export default useCommonGroundWebMCP;
