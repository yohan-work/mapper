import type { LngLat, Route, TravelMode } from "@/types";

const OSRM_BASE = "https://router.project-osrm.org";

const PROFILE: Record<Exclude<TravelMode, "subway">, string> = {
  driving: "driving",
  walking: "foot",
  cycling: "bike",
};

export async function fetchOsrmRoute(
  from: LngLat,
  to: LngLat,
  mode: TravelMode,
): Promise<Route | null> {
  if (mode === "subway") return null;
  const profile = PROFILE[mode] ?? "driving";
  const url = `${OSRM_BASE}/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    return {
      coordinates: route.geometry.coordinates as [number, number][],
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      provider: "osrm",
      isEstimated: false,
    };
  } catch {
    return null;
  }
}

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  const m = Math.round(seconds / 60);
  if (m < 1) return "1분 미만";
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm === 0 ? `${h}시간` : `${h}시간 ${rm}분`;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
