"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Activity,
  Hotel,
  Priority,
  Scenario,
  WorkspaceState,
} from "../consensus/types";
import { detectConflicts, generateScenarios } from "../consensus/scoring";
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
  openBookingDraft: (hotelId?: string) => void;
}

export interface CommonGroundWebMCPStatus {
  supported: boolean;
  registeredCount: number;
}

const PRIORITIES: Priority[] = ["must", "prefer", "flexible", "exclude"];
const SCENARIO_IDS: Scenario["id"][] = ["consensus", "value", "compromise"];

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
  const [status, setStatus] = useState<CommonGroundWebMCPStatus>({ supported: false, registeredCount: 0 });
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
      setStatus({ supported: false, registeredCount: 0 });
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
            execute: (args, executionOptions) =>
              options.execute(
                args,
                executionOptions?.signal ?? new AbortController().signal
              ),
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

    // ---------- READ TOOLS ----------

    register("get_workspace_state", {
      description:
        "Read the full shared trip workspace: travelers, their constraints and priorities, current scenarios, conflicts, and recent activity. Use first to orient before any other CommonGround tool.",
      inputSchema: schema({}, []),
      annotations: { readOnlyHint: true },
      execute: async () => {
        const s = P.current.state;
        return ok({
          destination: s.destination,
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
          const res = await fetch("/api/inventory", { signal });
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
            t.constraints.filter((c) => c.locked).map((c) => ({ travelerId: t.id, constraintId: c.id, label: c.label }))
          ),
          nextAction: "Propose set_constraint_priority or lock_constraint changes the humans can approve.",
        });
      },
    });

    // ---------- WRITE TOOLS ----------

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

    register("prepare_booking_draft", {
      description:
        "Open a human-confirmation booking draft UI for a hotel. Does NOT book, purchase, or charge anything — it only surfaces a draft the humans must approve. Optionally sets hotel/scenario first.",
      inputSchema: schema({
        hotelId: str("Hotel to draft. Defaults to the currently selected hotel."),
        scenarioId: enum_("Optional scenario context.", SCENARIO_IDS),
      }, []),
      annotations: { readOnlyHint: false },
      execute: async (args) => {
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
        P.current.openBookingDraft(hotelId);
        return ok({
          changed: { draftOpenedFor: hotel.name, hotelId },
          purchaseOccurred: false,
          nextAction: "Tell the humans to review and approve/reject the draft in the drawer. No purchase occurred.",
        });
      },
    });

    setStatus({ supported: true, registeredCount: count });

    return () => {
      controller.abort();
    };
  }, []);

  return status;
}

export default useCommonGroundWebMCP;
