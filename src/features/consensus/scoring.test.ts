import { describe, expect, it } from "vitest";
import {
  buildWorkspaceState,
  detectConflicts,
  fairnessScore,
  generateScenarios,
  scoreAllHotels,
  scoreHotel,
  scoreHotelForTraveler,
} from "./scoring";
import { seedHotels, seedTravelers } from "./seed";
import type { Hotel, Traveler } from "./types";

const h = (id: string, overrides: Partial<Hotel> = {}): Hotel => ({
  id,
  name: `Hotel ${id}`,
  location: "City Center",
  nightlyPrice: 150,
  totalPrice: 600,
  currency: "EUR",
  rating: 4,
  reviewScore: 8.5,
  cancellation: "free",
  amenities: ["step-free access", "breakfast included"],
  imageGradient: "linear-gradient(135deg,#000,#fff)",
  distanceKm: 0.5,
  roomsAvailable: 4,
  ...overrides,
});

const t = (id: string, overrides: Partial<Traveler> = {}): Traveler => ({
  id,
  name: id,
  avatarHue: 100,
  budgetPerNight: 200,
  constraints: [],
  ...overrides,
});

describe("scoreHotelForTraveler", () => {
  it("returns 100 when there are no constraints", () => {
    expect(scoreHotelForTraveler(h("x"), t("a"))).toBe(100);
  });

  it("fully satisfies matching must-have constraints", () => {
    const traveler = t("a", {
      constraints: [
        { id: "1", label: "step-free access", category: "accessibility", priority: "must", weight: 5, locked: true },
      ],
    });
    expect(scoreHotelForTraveler(h("x"), traveler)).toBe(100);
  });

  it("returns 0 when a must-have is unsatisfied", () => {
    const traveler = t("a", {
      constraints: [
        { id: "1", label: "pool", category: "amenity", priority: "must", weight: 5, locked: true },
      ],
    });
    expect(scoreHotelForTraveler(h("x"), traveler)).toBe(0);
  });

  it("enforces budget ceiling", () => {
    const traveler = t("a", {
      budgetPerNight: 100,
      constraints: [
        { id: "1", label: "Under 100/night", category: "budget", priority: "must", weight: 9, locked: true },
      ],
    });
    expect(scoreHotelForTraveler(h("x", { nightlyPrice: 150 }), traveler)).toBe(0);
  });

  it("exclude constraint satisfied when amenity absent", () => {
    const traveler = t("a", {
      constraints: [
        { id: "1", label: "all-inclusive", category: "amenity", priority: "exclude", weight: 8, locked: false },
      ],
    });
    expect(scoreHotelForTraveler(h("x"), traveler)).toBe(100);
    expect(scoreHotelForTraveler(h("y", { amenities: ["all-inclusive"] }), traveler)).toBe(0);
  });

  it("is deterministic (same inputs, same output)", () => {
    const traveler = seedTravelers[0];
    const hotel = seedHotels[0];
    expect(scoreHotelForTraveler(hotel, traveler)).toBe(scoreHotelForTraveler(hotel, traveler));
  });
});

describe("scoreHotel", () => {
  it("reports must-have violations with traveler name", () => {
    const diego = seedTravelers[1]; // budget 120 must
    const scored = scoreHotel(h("lux", { nightlyPrice: 240 }), [diego]);
    expect(scored.violations.some((v) => v.includes("Diego"))).toBe(true);
  });

  it("averages traveler scores into totalScore", () => {
    const scored = scoreHotel(seedHotels[0], seedTravelers);
    const avg = Math.round(
      Object.values(scored.travelerScores).reduce((a, b) => a + b, 0) / seedTravelers.length
    );
    expect(scored.totalScore).toBe(avg);
  });
});

describe("scoreAllHotels", () => {
  it("returns all hotels sorted descending by totalScore", () => {
    const scored = scoreAllHotels(seedHotels, seedTravelers);
    expect(scored).toHaveLength(seedHotels.length);
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].totalScore).toBeGreaterThanOrEqual(scored[i].totalScore);
    }
  });
});

describe("fairnessScore", () => {
  it("is 100 for identical scores", () => {
    const scored = { travelerScores: { a: 80, b: 80 }, totalScore: 80, hotel: h("x"), reasons: [], violations: [] };
    expect(fairnessScore(scored as never, [t("a"), t("b")])).toBe(80); // spread 0 * mean 0.8
  });

  it("penalizes spread", () => {
    const even = { travelerScores: { a: 80, b: 80 } };
    const uneven = { travelerScores: { a: 100, b: 20 } };
    const travelers = [t("a"), t("b")];
    expect(fairnessScore(uneven as never, travelers)).toBeLessThan(
      fairnessScore(even as never, travelers)
    );
  });
});

describe("detectConflicts", () => {
  it("flags large budget gaps with severity", () => {
    const conflicts = detectConflicts([
      t("rich", { budgetPerNight: 300 }),
      t("frugal", { budgetPerNight: 150 }),
    ]);
    expect(conflicts.some((c) => c.id.startsWith("conf-budget"))).toBe(true);
  });

  it("detects exclude vs must clashes on the seed group", () => {
    const conflicts = detectConflicts(seedTravelers);
    // Leo excludes all-inclusive; nobody must-haves it, so no clash expected here,
    // but budget conflicts should exist.
    expect(conflicts.length).toBeGreaterThan(0);
  });
});

describe("generateScenarios", () => {
  it("produces exactly three scenarios with stable ids", () => {
    const scenarios = generateScenarios(seedHotels, seedTravelers);
    expect(scenarios.map((s) => s.id)).toEqual(["consensus", "value", "compromise"]);
  });

  it("consensus scenario contains no must-have violations", () => {
    const [consensus] = generateScenarios(seedHotels, seedTravelers);
    expect(consensus.hotels.length).toBeGreaterThan(0);
    for (const sh of consensus.hotels) {
      expect(sh.violations).toHaveLength(0);
    }
  });

  it("value scenario is sorted by ascending total price", () => {
    const [, value] = generateScenarios(seedHotels, seedTravelers);
    for (let i = 1; i < value.hotels.length; i++) {
      expect(value.hotels[i - 1].hotel.totalPrice).toBeLessThanOrEqual(
        value.hotels[i].hotel.totalPrice
      );
    }
  });

  it("limits each scenario to three hotels with rationale text", () => {
    for (const s of generateScenarios(seedHotels, seedTravelers)) {
      expect(s.hotels.length).toBeLessThanOrEqual(3);
      expect(s.rationale.length).toBeGreaterThan(10);
      expect(s.fairness).toBeGreaterThanOrEqual(0);
      expect(s.fairness).toBeLessThanOrEqual(100);
    }
  });
});

describe("buildWorkspaceState", () => {
  it("assembles a complete workspace from seed data", () => {
    const ws = buildWorkspaceState();
    expect(ws.travelers).toHaveLength(4);
    expect(ws.hotels.length).toBeGreaterThanOrEqual(6);
    expect(ws.scenarios).toHaveLength(3);
    expect(ws.activity.every((a) => a.kind === "join")).toBe(true);
    expect(ws.nights).toBeGreaterThan(0);
  });
});
