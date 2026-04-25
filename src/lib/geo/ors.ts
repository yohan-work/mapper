import type { LngLat, Route, TravelMode } from "@/types";

const ORS_BASE = "https://api.openrouteservice.org/v2/directions";

const PROFILE: Record<Exclude<TravelMode, "subway">, string> = {
  driving: "driving-car",
  walking: "foot-walking",
  cycling: "cycling-regular",
};

export async function fetchOrsRoute(
  from: LngLat,
  to: LngLat,
  mode: TravelMode,
): Promise<Route | null> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey || mode === "subway") return null;

  const profile = PROFILE[mode];
  const res = await fetch(`${ORS_BASE}/${profile}/geojson`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
    },
    body: JSON.stringify({
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
      instructions: false,
    }),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number][] };
      properties?: {
        summary?: {
          distance?: number;
          duration?: number;
        };
      };
    }>;
  };

  const feature = data.features?.[0];
  const summary = feature?.properties?.summary;
  const coordinates = feature?.geometry?.coordinates;
  if (!summary || !coordinates?.length) return null;

  return {
    coordinates,
    distanceMeters: summary.distance ?? 0,
    durationSeconds: summary.duration ?? 0,
    provider: "ors",
    isEstimated: false,
  };
}
