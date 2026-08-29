export type Priority = "must" | "prefer" | "flexible" | "exclude";

export interface Traveler {
  id: string;
  name: string;
  avatarHue: number;
  budgetPerNight: number;
  constraints: Constraint[];
}

export interface Constraint {
  id: string;
  label: string;
  category:
    | "accessibility"
    | "family"
    | "amenity"
    | "location"
    | "budget"
    | "cancellation"
    | "rating";
  priority: Priority;
  /** Relative importance within a traveler's set; positive. */
  weight: number;
  /** Locked constraints cannot be traded away in compromise scenarios. */
  locked: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  nightlyPrice: number;
  totalPrice: number;
  currency: string;
  rating: number;
  reviewScore: number;
  cancellation: "free" | "partial" | "non-refundable";
  amenities: string[];
  /** CSS gradient placeholder — no remote images. */
  imageGradient: string;
  distanceKm: number;
  roomsAvailable: number;
}

export interface ScoredHotel {
  hotel: Hotel;
  totalScore: number;
  travelerScores: Record<string, number>;
  reasons: string[];
  violations: string[];
}

export interface Conflict {
  id: string;
  travelerIds: [string, string];
  description: string;
  severity: "low" | "medium" | "high";
  suggestedResolution: string;
}

export interface Scenario {
  id: "consensus" | "value" | "compromise";
  label: string;
  description: string;
  hotels: ScoredHotel[];
  fairness: number;
  rationale: string;
}

export interface Activity {
  id: string;
  actorId: string;
  kind: "join" | "constraint-add" | "constraint-update" | "scenario-view" | "approve";
  detail: string;
  at: string;
}

export interface WorkspaceState {
  travelers: Traveler[];
  hotels: Hotel[];
  scenarios: Scenario[];
  conflicts: Conflict[];
  activity: Activity[];
  nights: number;
  destination: string;
  checkIn: string;
}

export interface BookingDraft {
  id: string;
  hotelId: string;
  scenarioId: Scenario["id"];
  travelerIds: string[];
  nights: number;
  totalPrice: number;
  currency: string;
  status: "draft" | "proposed" | "approved" | "rejected";
  createdAt: string;
}
