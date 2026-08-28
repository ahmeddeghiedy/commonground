import { z } from "zod";
import { getInventory } from "@/server/services/trailtrix-inventory";

const QuerySchema = z.object({
  destination: z.string().trim().min(1).max(120).default("Lisbon, Portugal"),
  nights: z.coerce.number().int().min(1).max(30).default(4),
  travelers: z.coerce.number().int().min(1).max(12).default(4),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    destination: url.searchParams.get("destination") ?? undefined,
    nights: url.searchParams.get("nights") ?? undefined,
    travelers: url.searchParams.get("travelers") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query", issues: parsed.error.flatten() },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const ttl = Number(process.env.INVENTORY_CACHE_SECONDS ?? 300);
  const result = await getInventory(parsed.data.nights);

  return Response.json(
    {
      source: result.source,
      destination: parsed.data.destination,
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
