import { fetchOrsRoute } from "@/lib/geo/ors";
import { fetchOsrmRoute } from "@/lib/geo/osrm";
import { fetchSubwayRoute } from "@/lib/geo/subway";
import type { LngLat, Route, TravelMode } from "@/types";

const CYCLING_FALLBACK_SPEED_MPS = 15 / 3.6;
const SAME_POINT_THRESHOLD_METERS = 5;

export async function getBestRoute(
  from: LngLat,
  to: LngLat,
  mode: TravelMode,
): Promise<Route | null> {
  const directDistance = haversineMeters(from, to);
  if (directDistance <= SAME_POINT_THRESHOLD_METERS) {
    return {
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
      distanceMeters: Math.round(directDistance),
      durationSeconds: 0,
      provider: "estimated",
      isEstimated: true,
    };
  }

  if (mode === "cycling") {
    const orsCycling = await fetchOrsRoute(from, to, "cycling");
    if (isUsableRoute(orsCycling)) return orsCycling;

    const walkingBase =
      (await fetchOrsRoute(from, to, "walking")) ??
      (await fetchOsrmRoute(from, to, "walking"));
    if (walkingBase) {
      return {
        ...walkingBase,
        durationSeconds: Math.max(
          60,
          Math.round(walkingBase.distanceMeters / CYCLING_FALLBACK_SPEED_MPS),
        ),
        provider: "estimated",
        isEstimated: true,
      };
    }

    return null;
  }

  if (mode === "subway") {
    const subwayRoute = await fetchSubwayRoute(from, to);
    if (isUsableRoute(subwayRoute)) return subwayRoute;

    const walkingBase =
      (await fetchOrsRoute(from, to, "walking")) ??
      (await fetchOsrmRoute(from, to, "walking"));
    if (walkingBase) {
      return {
        ...walkingBase,
        durationSeconds: Math.max(
          walkingBase.durationSeconds,
          Math.round(walkingBase.durationSeconds * 0.72 + 240),
        ),
        provider: "subway-beta",
        isEstimated: true,
        summaryLabel: "가까운 지하철역을 찾지 못해 도보 기반으로 추정했습니다.",
        detailLabel: "지하철 베타 · 추정",
      };
    }

    return null;
  }

  const orsRoute = await fetchOrsRoute(from, to, mode);
  if (isUsableRoute(orsRoute)) return orsRoute;

  return await fetchOsrmRoute(from, to, mode);
}

function isUsableRoute(route: Route | null) {
  return Boolean(
    route &&
      route.coordinates.length > 1 &&
      Number.isFinite(route.distanceMeters) &&
      route.distanceMeters > 0 &&
      Number.isFinite(route.durationSeconds) &&
      route.durationSeconds >= 0,
  );
}

function haversineMeters(a: LngLat, b: LngLat) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 6371000 * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}
