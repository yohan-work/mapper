import type { PlaceSearchResult } from "@/types";

const NOMINATIM = "https://nominatim.openstreetmap.org";

export async function searchPlaces(
  query: string,
  opts: { limit?: number; lang?: string } = {},
): Promise<PlaceSearchResult[]> {
  if (!query.trim()) return [];
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(opts.limit ?? 8));
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("accept-language", opts.lang ?? "ko,en");

  const res = await fetch(url.toString(), {
    headers: {
      "Accept-Language": opts.lang ?? "ko,en",
    },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
  }>;
  return rows.map((r) => ({
    id: String(r.place_id),
    label: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}
