import { z } from "zod";
import { getInventory, inventoryProviderStatus } from "@/server/services/inventory-provider";
import { SEED_CHECK_IN } from "@/features/consensus/seed";

const QuerySchema = z.object({
  destination: z.string().trim().min(1).max(120).default("Lisbon, Portugal"),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights: z.coerce.number().int().min(1).max(30).default(4),
  travelers: z.coerce.number().int().min(1).max(30).default(4),
  mode: z.enum(["auto", "demo"]).default("auto"),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    destination: url.searchParams.get("destination") ?? undefined,
    // A parameterless request is the public demo inventory endpoint, so its
    // context must match the deterministic demo workspace instead of silently
    // drifting with the current date. Real workspaces always pass checkIn.
    checkIn: url.searchParams.get("checkIn") ?? SEED_CHECK_IN,
    nights: url.searchParams.get("nights") ?? undefined,
    travelers: url.searchParams.get("travelers") ?? undefined,
    mode: url.searchParams.get("mode") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query", issues: parsed.error.flatten() },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const ttl = Number(process.env.INVENTORY_CACHE_SECONDS ?? 300);
  const result = await getInventory(parsed.data, parsed.data.mode === "demo");

  return Response.json(
    {
      source: result.source,
      provider: { ...inventoryProviderStatus(), name: result.providerName, mode: result.mode },
      destination: parsed.data.destination,
      checkIn: parsed.data.checkIn,
      nights: parsed.data.nights,
      travelers: parsed.data.travelers,
      hotels: result.hotels,
      fetchedAt: result.fetchedAt,
      ...(result.error ? { fallbackReason: result.error } : {}),
    },
    {
      headers: {
        "cache-control": `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${ttl}`,
      },
    }
  );
}
