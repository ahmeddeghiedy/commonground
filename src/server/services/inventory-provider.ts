import "server-only";
import type { Hotel } from "@/features/consensus/types";
import { seedHotels } from "@/features/consensus/seed";

export type InventoryProviderId = "demo" | "wadjet" | "custom";

export interface InventorySearch {
  destination: string;
  nights: number;
  travelers: number;
}

export interface InventoryResult {
  source: InventoryProviderId;
  providerName: string;
  mode: "live" | "demo" | "fallback";
  hotels: Hotel[];
  fetchedAt: string;
  error?: string;
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => !!value && typeof value === "object" && !Array.isArray(value);
const first = (record: JsonRecord, keys: string[]) => keys.map((key) => record[key]).find((value) => value !== undefined && value !== null);
const number = (value: unknown, fallback: number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const text = (value: unknown, fallback: string) => typeof value === "string" && value.trim() ? value.trim() : fallback;

function readPath(payload: unknown, path?: string): unknown {
  if (!path) return payload;
  return path.split(".").reduce<unknown>((value, key) => isRecord(value) ? value[key] : undefined, payload);
}

function findHotelArray(payload: unknown, configuredPath?: string): unknown[] {
  const selected = readPath(payload, configuredPath);
  if (Array.isArray(selected)) return selected;
  if (!isRecord(selected)) return [];
  for (const path of ["hotels", "results", "items", "data.hotels", "data.results", "data.items", "data"]) {
    const candidate = readPath(selected, path);
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function normalizeCancellation(value: unknown): Hotel["cancellation"] {
  const normalized = text(value, "").toLowerCase();
  if (normalized.includes("free") || normalized.includes("flexible")) return "free";
  if (normalized.includes("non") || normalized.includes("none")) return "non-refundable";
  return "partial";
}

function normalizeAmenities(value: unknown): string[] {
  if (typeof value === "string") return value.split(/[,|]/).map((item) => item.trim()).filter(Boolean);
  if (!Array.isArray(value)) return [];
  return value.map((item) => isRecord(item) ? text(first(item, ["name", "label", "title"]), "") : text(item, "")).filter(Boolean);
}

export function normalizeHotel(raw: unknown, search: InventorySearch, index: number, prefix = "inventory"): Hotel | null {
  if (!isRecord(raw)) return null;
  const nightly = Math.round(number(first(raw, ["rate_per_night", "nightlyPrice", "nightly_price", "pricePerNight", "price_per_night", "rate", "price"]), 0));
  const suppliedTotal = number(first(raw, ["totalPrice", "total_price", "stayTotal", "stay_total"]), 0);
  if (nightly <= 0 && suppliedTotal <= 0) return null;
  const resolvedNightly = nightly > 0 ? nightly : Math.round(suppliedTotal / search.nights);
  const amenities = normalizeAmenities(first(raw, ["amenities", "facilities", "features"]));
  return {
    id: text(first(raw, ["hotelId", "hotel_id", "HotelId", "id", "code"]), `${prefix}-${index + 1}`),
    name: text(first(raw, ["name", "hotelName", "hotel_name", "HotelName", "title"]), `Hotel ${index + 1}`),
    location: text(first(raw, ["area", "location", "city", "destination", "address"]), search.destination),
    nightlyPrice: resolvedNightly,
    totalPrice: suppliedTotal > 0 ? Math.round(suppliedTotal) : resolvedNightly * search.nights,
    currency: text(first(raw, ["currency", "currencyCode", "currency_code"]), "EUR").toUpperCase(),
    rating: Math.min(5, Math.max(1, Math.round(number(first(raw, ["rating", "stars", "starRating", "star_rating"]), 4)))),
    reviewScore: Math.min(10, Math.max(0, number(first(raw, ["review_score", "reviewScore", "guestRating", "guest_rating", "score"]), 8))),
    cancellation: normalizeCancellation(first(raw, ["cancellation_policy", "cancellationPolicy", "cancellation"])),
    amenities,
    imageGradient: "linear-gradient(135deg,#164e63,#6366f1)",
    distanceKm: Math.max(0, number(first(raw, ["distance_km", "distanceKm", "distance"]), 1)),
    roomsAvailable: Math.max(0, Math.round(number(first(raw, ["rooms_left", "roomsAvailable", "rooms_available", "availability", "inventory"]), search.travelers))),
  };
}

function demoInventory(search: InventorySearch): InventoryResult {
  return {
    source: "demo",
    providerName: "Curated challenge catalog",
    mode: "demo",
    hotels: seedHotels.map((hotel) => ({ ...hotel, totalPrice: hotel.nightlyPrice * search.nights })),
    fetchedAt: new Date().toISOString(),
  };
}

function providerConfig() {
  const requested = (process.env.INVENTORY_PROVIDER ?? (process.env.WADJET_INVENTORY_URL ? "wadjet" : "demo")).toLowerCase();
  const provider: InventoryProviderId = requested === "wadjet" ? "wadjet" : requested === "custom" ? "custom" : "demo";
  if (provider === "demo") return { provider, name: "Curated challenge catalog", url: "", key: "" };
  const prefix = provider === "wadjet" ? "WADJET_INVENTORY" : "CUSTOM_INVENTORY";
  return {
    provider,
    name: process.env.INVENTORY_PROVIDER_NAME || (provider === "wadjet" ? "Wadjet Travel" : "Connected inventory provider"),
    url: process.env[`${prefix}_URL`] || process.env.INVENTORY_API_URL || "",
    key: process.env[`${prefix}_API_KEY`] || process.env.INVENTORY_API_KEY || "",
  };
}

export function inventoryProviderStatus() {
  const config = providerConfig();
  return {
    id: config.provider,
    name: config.name,
    configured: config.provider === "demo" || Boolean(config.url),
    live: config.provider !== "demo" && Boolean(config.url),
  };
}

export async function getInventory(search: InventorySearch, forceDemo = false): Promise<InventoryResult> {
  const config = providerConfig();
  if (forceDemo || config.provider === "demo" || !config.url) return demoInventory(search);
  const now = new Date().toISOString();
  try {
    const method = (process.env.INVENTORY_REQUEST_METHOD ?? "GET").toUpperCase() === "POST" ? "POST" : "GET";
    const url = new URL(config.url);
    const headers: Record<string, string> = { accept: "application/json" };
    if (config.key) {
      const header = process.env.INVENTORY_AUTH_HEADER || "authorization";
      const scheme = process.env.INVENTORY_AUTH_SCHEME ?? "Bearer";
      headers[header] = scheme ? `${scheme} ${config.key}` : config.key;
    }
    let body: string | undefined;
    if (method === "POST") {
      headers["content-type"] = "application/json";
      body = JSON.stringify(search);
    } else {
      url.searchParams.set("destination", search.destination);
      url.searchParams.set("nights", String(search.nights));
      url.searchParams.set("travelers", String(search.travelers));
    }
    const response = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const payload = await response.json() as unknown;
    const hotels = findHotelArray(payload, process.env.INVENTORY_RESPONSE_PATH)
      .map((hotel, index) => normalizeHotel(hotel, search, index, config.provider))
      .filter((hotel): hotel is Hotel => hotel !== null);
    if (!hotels.length) throw new Error("provider returned no usable hotels");
    return { source: config.provider, providerName: config.name, mode: "live", hotels, fetchedAt: now };
  } catch (error) {
    const fallback = demoInventory(search);
    return { ...fallback, source: config.provider, providerName: config.name, mode: "fallback", error: error instanceof Error ? error.message : "unknown provider error" };
  }
}
