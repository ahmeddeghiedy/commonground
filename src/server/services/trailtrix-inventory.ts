import "server-only";
import type { Hotel } from "@/features/consensus/types";
import { seedHotels } from "@/features/consensus/seed";

export interface InventoryResult {
  source: "trailtrix" | "seed";
  hotels: Hotel[];
  fetchedAt: string;
  error?: string;
}

interface TrailTrixRoom {
  hotelId?: string;
  name?: string;
  area?: string;
  rate_per_night?: number;
  rating?: number;
  review_score?: number;
  cancellation_policy?: string;
  amenities?: string[];
  distance_km?: number;
  rooms_left?: number;
  currency?: string;
}

function normalizeCancellation(cancellation: string | undefined): Hotel["cancellation"] {
  const c = (cancellation ?? "").toLowerCase();
  if (c.includes("free")) return "free";
  if (c.includes("non") || c.includes("none")) return "non-refundable";
  return "partial";
}

function toHotel(room: TrailTrixRoom, stayNights: number, index: number): Hotel {
  const nightly = Math.round(room.rate_per_night ?? 150);
  return {
    id: room.hotelId ?? `tt-${index}`,
    name: room.name ?? `TrailTrix Hotel ${index + 1}`,
    location: room.area ?? "Unknown",
    nightlyPrice: nightly,
    totalPrice: nightly * stayNights,
    currency: room.currency ?? "EUR",
    rating: Math.min(5, Math.max(1, Math.round(room.rating ?? 4))),
    reviewScore: Math.min(10, Math.max(0, room.review_score ?? 8)),
    cancellation: normalizeCancellation(room.cancellation_policy),
    amenities: room.amenities ?? [],
    imageGradient: "linear-gradient(135deg,#334155,#0ea5e9)",
    distanceKm: room.distance_km ?? 1,
    roomsAvailable: room.rooms_left ?? 1,
  };
}

export async function getInventory(
  nights: number
): Promise<InventoryResult> {
  const url = process.env.TRAILTRIX_INVENTORY_URL;
  const key = process.env.TRAILTRIX_API_KEY;
  const now = new Date().toISOString();

  if (!url || !key) {
    return { source: "seed", hotels: seedHotels, fetchedAt: now };
  }

  try {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${key}`, accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const rooms = (await res.json()) as TrailTrixRoom[];
    if (!Array.isArray(rooms) || rooms.length === 0) throw new Error("empty inventory");
    return {
      source: "trailtrix",
      hotels: rooms.map((r, i) => toHotel(r, nights, i)),
      fetchedAt: now,
    };
  } catch (err) {
    return {
      source: "seed",
      hotels: seedHotels,
      fetchedAt: now,
      error: err instanceof Error ? err.message : "unknown upstream error",
    };
  }
}
