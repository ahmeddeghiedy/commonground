# Inventory integrations and demo data

CommonGround uses one normalized hotel model regardless of supplier. The scoring engine, UI, and `search_hotel_inventory` WebMCP tool therefore remain unchanged when the source switches between Wadjet Travel, another API, or the curated challenge catalog.

## Runtime modes

Set `INVENTORY_PROVIDER` in the server environment:

| Value | Behaviour |
|---|---|
| `demo` | Uses the deterministic catalog in `src/features/consensus/seed.ts`. No credentials required. |
| `wadjet` | Calls the private Wadjet inventory endpoint configured below. |
| `custom` | Calls another REST/JSON supplier through the same secure adapter. |

If a live provider times out, returns an error, or produces no usable hotels, CommonGround automatically falls back to the demo catalog and labels that state in the UI and API response.

## Connect Wadjet Travel

Wadjet's public website does not currently publish an inventory API contract. Obtain the private search endpoint and a server credential from the Wadjet backend team, then configure these Sites runtime values:

```dotenv
INVENTORY_PROVIDER=wadjet
INVENTORY_PROVIDER_NAME=Wadjet Travel
WADJET_INVENTORY_URL=https://YOUR-WADJET-API.example/hotel-inventory
WADJET_API_KEY=YOUR_SERVER_SIDE_KEY
INVENTORY_REQUEST_METHOD=GET
INVENTORY_AUTH_HEADER=authorization
INVENTORY_AUTH_SCHEME=Bearer
INVENTORY_RESPONSE_PATH=data.hotels
```

For `GET`, CommonGround sends `destination`, `nights`, and `travelers` as query parameters. For `POST`, it sends the same fields as JSON. The key is attached only by the server and never returned to the page or WebMCP agent.

The adapter recognizes common Wadjet and supplier aliases, including:

- ID: `hotelId`, `hotel_id`, `HotelId`, `id`, `code`
- Name: `name`, `hotelName`, `hotel_name`, `HotelName`, `title`
- Nightly price: `rate_per_night`, `nightlyPrice`, `nightly_price`, `pricePerNight`, `rate`, `price`
- Total stay price: `totalPrice`, `total_price`, `stayTotal`
- Rating/reviews: `rating`, `stars`, `review_score`, `reviewScore`, `guestRating`
- Inventory: `rooms_left`, `roomsAvailable`, `availability`, `inventory`
- Amenities: `amenities`, `facilities`, `features`

A minimal response may be an array or an envelope:

```json
{
  "data": {
    "hotels": [
      {
        "hotelId": "wad-123",
        "name": "Wadjet Marina Hotel",
        "area": "Barcelona",
        "rate_per_night": 175,
        "currency": "EUR",
        "review_score": 9.1,
        "cancellation_policy": "Free cancellation",
        "amenities": ["pool", "step-free access"],
        "rooms_left": 8
      }
    ]
  }
}
```

## Replace Wadjet with another API

Set `INVENTORY_PROVIDER=custom`, then use:

```dotenv
CUSTOM_INVENTORY_URL=https://supplier.example/search
CUSTOM_INVENTORY_API_KEY=YOUR_KEY
INVENTORY_PROVIDER_NAME=Supplier display name
```

The method, authentication header/scheme, and response path controls are shared with the Wadjet configuration. If the supplier's data cannot be expressed through the recognized aliases, add its field names only inside `normalizeHotel()` in `src/server/services/inventory-provider.ts`; no UI or WebMCP changes are needed.

## Populate and refresh demo data

The checked-in catalog lives in `src/features/consensus/seed.ts`. Each hotel must provide:

- stable `id`, `name`, and `location`;
- `nightlyPrice`, `currency`, star `rating`, and 0–10 `reviewScore`;
- cancellation policy (`free`, `partial`, or `non-refundable`);
- normalized amenity strings used by scoring;
- distance and available-room count.

`totalPrice` is recalculated for the requested number of nights at runtime. Add or edit catalog records, run the tests, and redeploy. The inventory badge opens a source inspector and provides a manual refresh action.

## Provider health contract

- `GET /api/inventory?destination=Barcelona&nights=4&travelers=6` returns the normalized hotels plus provider identity, mode, fetch time, and optional fallback reason.
- Add `mode=demo` to deliberately exercise the deterministic catalog even when a live provider is configured.
- `GET /api/health` reports the configured provider without exposing its URL or credentials.
