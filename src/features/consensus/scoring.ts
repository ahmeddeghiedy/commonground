import type {
  Conflict,
  Hotel,
  Scenario,
  ScoredHotel,
  Traveler,
  WorkspaceState,
} from "./types";
import { SEED_DESTINATION, SEED_NIGHTS, seedHotels, seedTravelers } from "./seed";

const PRIORITY_MULTIPLIER: Record<string, number> = {
  must: 1.5,
  prefer: 1.0,
  flexible: 0.5,
  exclude: 1.0,
};

const MAX_SCORE = 100;

function amenityMatches(hotel: Hotel, label: string): boolean {
  const norm = label.toLowerCase();
  const haystack = [hotel.name, hotel.location, ...hotel.amenities].join(" ").toLowerCase();
  if (haystack.includes(norm)) return true;
  // keyword mapping for common constraint phrasings
  if (/beach/.test(norm)) return haystack.includes("beach") || hotel.distanceKm <= 0.5 && /caparica|cascais/.test(haystack);
  if (/city center|centre/.test(norm)) return /city center|baixa|avenida|alfama/i.test(haystack);
  if (/pool/.test(norm)) return haystack.includes("pool");
  if (/breakfast/.test(norm)) return haystack.includes("breakfast");
  if (/gym/.test(norm)) return haystack.includes("gym");
  if (/family|kids stay free/.test(norm)) {
    return haystack.includes("family rooms") || haystack.includes("kids stay free");
  }
  return false;
}

function budgetOk(hotel: Hotel, traveler: Traveler): boolean {
  return hotel.nightlyPrice <= traveler.budgetPerNight;
}

/** Pure deterministic score of one hotel for one traveler (0..MAX). */
export function scoreHotelForTraveler(hotel: Hotel, traveler: Traveler): number {
  if (traveler.constraints.length === 0) return MAX_SCORE;

  let earned = 0;
  let possible = 0;

  for (const c of traveler.constraints) {
    const value = c.weight * PRIORITY_MULTIPLIER[c.priority];
    possible += value;
    let satisfied = false;
    switch (c.category) {
      case "budget":
        satisfied = c.priority === "exclude" ? false : budgetOk(hotel, traveler);
        break;
      case "cancellation":
        satisfied =
          c.priority === "exclude" ? false : hotel.cancellation === "free" || (hotel.cancellation === "partial" && c.priority === "flexible");
        break;
      case "rating":
        satisfied = hotel.reviewScore >= 8.5;
        break;
      case "location":
        satisfied = amenityMatches(hotel, c.label) || hotel.distanceKm <= 1;
        break;
      default:
        satisfied = amenityMatches(hotel, c.label);
    }
    // 'exclude' constraints invert: satisfied means hotel does NOT match.
    if (c.priority === "exclude") satisfied = !amenityMatches(hotel, c.label);
    if (satisfied) earned += value;
  }

  return Math.round((earned / Math.max(possible, 1)) * MAX_SCORE);
}

function violationsFor(hotel: Hotel, traveler: Traveler): string[] {
  const out: string[] = [];
  for (const c of traveler.constraints) {
    if (c.priority !== "must") continue;
    const failed =
      c.category === "budget"
        ? !budgetOk(hotel, traveler)
        : !(
            c.category === "rating"
              ? hotel.reviewScore >= 8.5
              : c.category === "cancellation"
                ? hotel.cancellation === "free"
                : amenityMatches(hotel, c.label)
          );
    if (failed) out.push(`${traveler.name}: "${c.label}" not met`);
  }
  return out;
}

export function scoreHotel(hotel: Hotel, travelers: Traveler[]): ScoredHotel {
  const travelerScores: Record<string, number> = {};
  const reasons: string[] = [];
  const violations: string[] = [];
  let sum = 0;
  for (const t of travelers) {
    const s = scoreHotelForTraveler(hotel, t);
    travelerScores[t.id] = s;
    sum += s;
    violations.push(...violationsFor(hotel, t));
    if (s >= 70) reasons.push(`${t.name} scores ${s}/100`);
  }
  const totalScore = Math.round(sum / Math.max(travelers.length, 1));
  if (hotel.roomsAvailable >= travelers.length) reasons.push(`${hotel.roomsAvailable} rooms available`);
  return { hotel, totalScore, travelerScores, reasons, violations };
}

export function scoreAllHotels(hotels: Hotel[], travelers: Traveler[]): ScoredHotel[] {
  return hotels.map((h) => scoreHotel(h, travelers)).sort((a, b) => b.totalScore - a.totalScore);
}

/** Fairness: 100 when all travelers' scores are equal; falls toward 0 with spread. */
export function fairnessScore(scored: ScoredHotel, travelers: Traveler[]): number {
  if (travelers.length <= 1) return 100;
  const scores = travelers.map((t) => scored.travelerScores[t.id] ?? 0);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  const normalized = Math.max(0, 100 - spread);
  return Math.round(normalized * (mean / MAX_SCORE));
}

export function detectConflicts(travelers: Traveler[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (let i = 0; i < travelers.length; i++) {
    for (let j = i + 1; j < travelers.length; j++) {
      const a = travelers[i];
      const b = travelers[j];
      // Budget gap conflict
      const gap = Math.abs(a.budgetPerNight - b.budgetPerNight);
      if (gap >= 80) {
        conflicts.push({
          id: `conf-budget-${a.id}-${b.id}`,
          travelerIds: [a.id, b.id],
          description: `Nightly budgets differ by €${gap} (${a.name}: €${a.budgetPerNight}, ${b.name}: €${b.budgetPerNight}).`,
          severity: gap >= 120 ? "high" : "medium",
          suggestedResolution:
            "Split cost difference or pick a mid-range hotel with the must-haves of both.",
        });
      }
      // Opposing amenity preferences (exclude vs prefer on same topic)
      for (const ca of a.constraints) {
        for (const cb of b.constraints) {
          if (ca.priority === "exclude" && ["prefer", "must"].includes(cb.priority)) {
            const keyword = cb.label.split(" ")[0].toLowerCase();
            if (ca.label.toLowerCase().includes(keyword) && keyword.length > 3) {
              conflicts.push({
                id: `conf-${ca.id}-${cb.id}`,
                travelerIds: [a.id, b.id],
                description: `${a.name} wants to avoid "${ca.label}" while ${b.name} wants "${cb.label}".`,
                severity: cb.priority === "must" ? "high" : "low",
                suggestedResolution: "Look for properties offering the amenity à la carte, or adjacent rooms.",
              });
            }
          }
        }
      }
    }
  }
  return conflicts;
}

export function generateScenarios(hotels: Hotel[], travelers: Traveler[]): Scenario[] {
  const scored = scoreAllHotels(hotels, travelers);
  const noMustViolations = scored.filter((s) => s.violations.length === 0);

  const consensus = [...noMustViolations].sort(
    (a, b) =>
      fairnessScore(b, travelers) - fairnessScore(a, travelers) ||
      b.totalScore - a.totalScore
  );

  const value = [...scored].sort((a, b) => a.hotel.totalPrice - b.hotel.totalPrice);

  const compromise = [...scored].sort(
    (a, b) =>
      Math.round(b.totalScore * 0.6 + fairnessScore(b, travelers) * 0.4) -
      Math.round(a.totalScore * 0.6 + fairnessScore(a, travelers) * 0.4)
  );

  const top = (list: ScoredHotel[]) => list.slice(0, 3);

  return [
    {
      id: "consensus",
      label: "Group Consensus",
      description: "Hotels meeting every must-have with the most even satisfaction across travelers.",
      hotels: top(consensus),
      fairness: consensus.length ? fairnessScore(consensus[0], travelers) : 0,
      rationale:
        "Ranked by fairness first, then average score. Must-have violations excluded.",
    },
    {
      id: "value",
      label: "Best Value",
      description: "Lowest total price hotels that still respect must-have constraints where possible.",
      hotels: top(value),
      fairness: value.length ? fairnessScore(value[0], travelers) : 0,
      rationale: "Sorted by total price ascending; check per-traveler scores before booking.",
    },
    {
      id: "compromise",
      label: "Balanced Compromise",
      description: "Blends overall score (60%) and fairness (40%) — the middle path.",
      hotels: top(compromise),
      fairness: compromise.length ? fairnessScore(compromise[0], travelers) : 0,
      rationale: "Weighted blend rewarding both high average satisfaction and even distribution.",
    },
  ];
}

export function buildWorkspaceState(
  hotels: Hotel[] = seedHotels,
  travelers: Traveler[] = seedTravelers
): WorkspaceState {
  return {
    travelers,
    hotels,
    scenarios: generateScenarios(hotels, travelers),
    conflicts: detectConflicts(travelers),
    activity: travelers.map((t) => ({
      id: `act-join-${t.id}`,
      actorId: t.id,
      kind: "join" as const,
      detail: `${t.name} joined the workspace`,
      at: "2025-01-01T09:00:00.000Z",
    })),
    nights: SEED_NIGHTS,
    destination: SEED_DESTINATION,
  };
}
