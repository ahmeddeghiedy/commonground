import { describe, expect, it } from "vitest";
import { normalizeHotel } from "./inventory-provider";

const search = { destination: "Barcelona", checkIn: "2026-11-10", nights: 4, travelers: 6 };

describe("normalizeHotel", () => {
  it("normalizes Wadjet-style snake_case fields", () => {
    const hotel = normalizeHotel({
      hotelId: "wad-1", name: "Wadjet Marina", area: "Port Vell", rate_per_night: 175,
      review_score: 9.1, cancellation_policy: "Free cancellation", amenities: ["pool"], rooms_left: 8,
    }, search, 0, "wadjet");
    expect(hotel).toMatchObject({ id: "wad-1", nightlyPrice: 175, totalPrice: 700, cancellation: "free", roomsAvailable: 8 });
  });

  it("normalizes a generic provider response", () => {
    const hotel = normalizeHotel({
      id: "custom-1", hotelName: "Civic House", location: "Eixample", totalPrice: 640,
      currencyCode: "usd", starRating: 4, guestRating: 8.7, facilities: "gym, breakfast", availability: 7,
    }, search, 0, "custom");
    expect(hotel).toMatchObject({ nightlyPrice: 160, totalPrice: 640, currency: "USD", reviewScore: 8.7 });
    expect(hotel?.amenities).toEqual(["gym", "breakfast"]);
  });

  it("rejects records with no usable price", () => {
    expect(normalizeHotel({ id: "bad", name: "No price" }, search, 0)).toBeNull();
  });
});
