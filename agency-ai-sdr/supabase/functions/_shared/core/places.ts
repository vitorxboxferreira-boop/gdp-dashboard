// Cliente da Google Places API (New) — Text Search.
// Documentação: https://developers.google.com/maps/documentation/places/web-service/text-search
//
// O field mask abaixo inclui websiteUri e telefones, o que coloca a chamada em
// um SKU de maior custo. O custo estimado por requisição é configurável no
// painel (agent_settings.places_cost_per_request_usd) e deve ser conferido na
// tabela oficial de preços da Google Maps Platform.

import { normalizeBrPhone } from "./phone.ts";
import { classifyWebsite, type WebsiteStatus } from "./website.ts";

export const PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

export const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.types",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.rating",
  "places.userRatingCount",
  "nextPageToken",
].join(",");

export interface PlacesAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

export interface PlaceResult {
  id: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  addressComponents?: PlacesAddressComponent[];
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  rating?: number;
  userRatingCount?: number;
}

export interface TextSearchResponse {
  places?: PlaceResult[];
  nextPageToken?: string;
}

export interface SearchArea {
  id: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  radius_m: number;
  categories: string[];
  category_cursor: number;
}

export class PlacesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "PlacesApiError";
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function buildTextQuery(category: string, area: Pick<SearchArea, "city" | "state">): string {
  return `${category} em ${area.city}, ${area.state}`;
}

export function buildSearchBody(
  textQuery: string,
  area: Pick<SearchArea, "latitude" | "longitude" | "radius_m">,
  pageToken?: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    textQuery,
    languageCode: "pt-BR",
    regionCode: "BR",
    pageSize: 20,
  };
  if (area.latitude != null && area.longitude != null) {
    body.locationBias = {
      circle: {
        center: { latitude: area.latitude, longitude: area.longitude },
        radius: Math.min(area.radius_m, 50000),
      },
    };
  }
  if (pageToken) body.pageToken = pageToken;
  return body;
}

/** Executa uma página de Text Search. Lança PlacesApiError em respostas não-2xx. */
export async function searchTextPage(opts: {
  apiKey: string;
  textQuery: string;
  area: Pick<SearchArea, "latitude" | "longitude" | "radius_m">;
  pageToken?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<TextSearchResponse> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  let res: Response;
  try {
    res = await fetchImpl(PLACES_TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": opts.apiKey,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
      },
      body: JSON.stringify(buildSearchBody(opts.textQuery, opts.area, opts.pageToken)),
      signal: controller.signal,
    });
  } catch (err) {
    throw new PlacesApiError(`Falha de rede ao chamar Places API: ${(err as Error).message}`, 0, true);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const json = (await res.json()) as { error?: { message?: string; status?: string } };
      detail = json.error?.message ?? json.error?.status ?? "";
    } catch {
      /* corpo não-JSON */
    }
    const retryable = res.status === 429 || res.status >= 500;
    throw new PlacesApiError(`Places API respondeu ${res.status}${detail ? `: ${detail}` : ""}`, res.status, retryable);
  }
  return (await res.json()) as TextSearchResponse;
}

export interface CompanyDraft {
  place_id: string;
  source: "google_places";
  name: string;
  primary_category: string | null;
  category_label: string | null;
  types: string[];
  formatted_address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone_national: string | null;
  phone_e164: string | null;
  website_uri: string | null;
  website_status: WebsiteStatus;
  google_maps_uri: string | null;
  business_status: string | null;
  rating: number | null;
  user_rating_count: number | null;
}

function component(place: PlaceResult, type: string, short = false): string | null {
  const c = place.addressComponents?.find((x) => x.types?.includes(type));
  if (!c) return null;
  return (short ? c.shortText : c.longText) ?? c.longText ?? c.shortText ?? null;
}

/** Converte o resultado do Places em um rascunho de empresa. Não inventa campos ausentes. */
export function mapPlaceToCompany(place: PlaceResult, area?: Pick<SearchArea, "city" | "state">): CompanyDraft | null {
  const name = place.displayName?.text?.trim();
  if (!place.id || !name) return null;
  const phoneE164 =
    normalizeBrPhone(place.internationalPhoneNumber) ?? normalizeBrPhone(place.nationalPhoneNumber);
  const rating = typeof place.rating === "number" ? Math.round(place.rating * 10) / 10 : null;
  return {
    place_id: place.id,
    source: "google_places",
    name,
    primary_category: place.primaryType ?? null,
    category_label: place.primaryTypeDisplayName?.text ?? null,
    types: place.types ?? [],
    formatted_address: place.formattedAddress ?? null,
    city:
      component(place, "administrative_area_level_2") ?? component(place, "locality") ?? area?.city ?? null,
    state: component(place, "administrative_area_level_1", true) ?? area?.state ?? null,
    country: component(place, "country", true) ?? "BR",
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    phone_national: place.nationalPhoneNumber ?? null,
    phone_e164: phoneE164,
    website_uri: place.websiteUri ?? null,
    website_status: classifyWebsite(place.websiteUri),
    google_maps_uri: place.googleMapsUri ?? null,
    business_status: place.businessStatus ?? null,
    rating,
    user_rating_count: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
  };
}
