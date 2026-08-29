export interface InventoryQuery {
  destination: string;
  checkIn: string;
  nights: number;
  travelers: number;
}

export interface InventoryResponse {
  source: "demo" | "wadjet" | "custom";
  provider: { id: string; name: string; mode: "live" | "demo" | "fallback"; configured: boolean; live: boolean };
  hotels: unknown[];
  fetchedAt: string;
}

/** Client-side fetch wrapper for the inventory API. */
export async function fetchInventory(query: InventoryQuery): Promise<InventoryResponse> {
  const params = new URLSearchParams({
    destination: query.destination,
    checkIn: query.checkIn,
    nights: String(query.nights),
    travelers: String(query.travelers),
  });
  const res = await fetch(`/api/inventory?${params.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Inventory request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as InventoryResponse;
}
