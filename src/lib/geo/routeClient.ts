import type { LngLat, Route, TravelMode } from "@/types";

export async function fetchRoute(
  from: LngLat,
  to: LngLat,
  mode: TravelMode,
): Promise<Route | null> {
  const url = new URL("/api/route", window.location.origin);
  url.searchParams.set("fromLng", String(from.lng));
  url.searchParams.set("fromLat", String(from.lat));
  url.searchParams.set("toLng", String(to.lng));
  url.searchParams.set("toLat", String(to.lat));
  url.searchParams.set("mode", mode);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { route?: Route | null };
    return data.route ?? null;
  } catch {
    return null;
  }
}
