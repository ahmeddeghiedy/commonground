import { describe, expect, it } from "vitest";
import { SEED_CHECK_IN } from "@/features/consensus/seed";
import { GET } from "./route";

describe("demo inventory endpoint", () => {
  it("uses the demo workspace context when no query is supplied", async () => {
    const response = await GET(new Request("https://commonground.example/api/inventory"));
    const payload = await response.json() as {
      destination: string;
      checkIn: string;
      nights: number;
      travelers: number;
      hotels: unknown[];
    };

    expect(response.ok).toBe(true);
    expect(payload).toMatchObject({
      destination: "Lisbon, Portugal",
      checkIn: SEED_CHECK_IN,
      nights: 4,
      travelers: 4,
    });
    expect(payload.hotels).toHaveLength(6);
  });
});
