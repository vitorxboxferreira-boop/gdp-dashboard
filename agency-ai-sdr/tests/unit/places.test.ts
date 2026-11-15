import { describe, expect, it, vi } from "vitest";
import { buildSearchBody, mapPlaceToCompany, PLACES_FIELD_MASK, PlacesApiError, searchTextPage } from "@core/places.ts";

const area = { latitude: -30.89, longitude: -55.53, radius_m: 8000, city: "Sant'Ana do Livramento", state: "RS" };

describe("Places API (New) — Text Search", () => {
  it("monta requisição com field mask, idioma e viés de localização", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ places: [], nextPageToken: "n1" }), { status: 200 }));
    const res = await searchTextPage({ apiKey: "KEY", textQuery: "padaria em X", area, fetchImpl });
    expect(res.nextPageToken).toBe("n1");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("KEY");
    expect(headers["X-Goog-FieldMask"]).toBe(PLACES_FIELD_MASK);
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ textQuery: "padaria em X", languageCode: "pt-BR", regionCode: "BR", pageSize: 20 });
    expect(body.locationBias.circle.radius).toBe(8000);
  });

  it("inclui pageToken quando informado", () => {
    expect(buildSearchBody("q", area, "tok").pageToken).toBe("tok");
  });

  it("erros 4xx não são repetidos; 429/5xx são", async () => {
    const bad = vi.fn(async () => new Response(JSON.stringify({ error: { message: "API key not valid" } }), { status: 400 }));
    await expect(searchTextPage({ apiKey: "x", textQuery: "q", area, fetchImpl: bad })).rejects.toMatchObject({ status: 400, retryable: false });
    const limited = vi.fn(async () => new Response("{}", { status: 429 }));
    await expect(searchTextPage({ apiKey: "x", textQuery: "q", area, fetchImpl: limited })).rejects.toMatchObject({ retryable: true });
    const down = vi.fn(async () => { throw new TypeError("network"); });
    await expect(searchTextPage({ apiKey: "x", textQuery: "q", area, fetchImpl: down })).rejects.toBeInstanceOf(PlacesApiError);
  });

  it("mapeia resultado sem inventar dados", () => {
    const draft = mapPlaceToCompany({
      id: "ChIJ123",
      displayName: { text: "Salão Exemplo" },
      formattedAddress: "Rua A, 1 - Centro, Sant'Ana do Livramento - RS",
      addressComponents: [
        { longText: "Sant'Ana do Livramento", types: ["administrative_area_level_2", "political"] },
        { longText: "Rio Grande do Sul", shortText: "RS", types: ["administrative_area_level_1"] },
        { longText: "Brasil", shortText: "BR", types: ["country"] },
      ],
      primaryType: "beauty_salon",
      primaryTypeDisplayName: { text: "Salão de beleza" },
      internationalPhoneNumber: "+55 55 99999-1234",
      websiteUri: "https://instagram.com/salao",
      rating: 4.66,
      userRatingCount: 40,
      businessStatus: "OPERATIONAL",
    });
    expect(draft).toMatchObject({
      place_id: "ChIJ123", name: "Salão Exemplo", city: "Sant'Ana do Livramento", state: "RS", country: "BR",
      phone_e164: "+5555999991234", website_status: "social_only", rating: 4.7, user_rating_count: 40,
    });
    const minimal = mapPlaceToCompany({ id: "p2", displayName: { text: "Loja" } }, area);
    expect(minimal).toMatchObject({ phone_e164: null, website_status: "not_identified", rating: null, city: area.city });
    expect(mapPlaceToCompany({ id: "p3" })).toBeNull();
  });
});
