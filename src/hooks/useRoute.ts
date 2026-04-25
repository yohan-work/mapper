"use client";

import { useEffect, useState } from "react";
import { fetchRoute } from "@/lib/geo/routeClient";
import type { LngLat, Route, TravelMode } from "@/types";

/**
 * from/to 변화에 따라 OSRM 경로를 가져온다. 과도한 호출을 막기 위해
 * 출발지가 최소 30m 이상 이동했을 때만 갱신한다.
 */
export function useRoute(
  from: LngLat | null,
  to: LngLat | null,
  mode: TravelMode,
) {
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!from || !to) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await fetchRoute(from, to, mode);
      if (!cancelled) {
        setRoute(r);
        setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // 좌표를 내림해서 미세 변화는 무시 (약 ~30m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    round(from?.lat),
    round(from?.lng),
    round(to?.lat),
    round(to?.lng),
    mode,
  ]);

  return { route, loading };
}

function round(n?: number) {
  if (n == null) return null;
  return Math.round(n * 3000) / 3000; // ~37m @서울
}
