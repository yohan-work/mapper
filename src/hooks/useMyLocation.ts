"use client";

import { useEffect, useState } from "react";
import { watchPosition, type Position } from "@/lib/geo/geolocation";

export function useMyLocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stop = watchPosition(
      (p) => setPosition(p),
      (err) => setError(err.message || "위치 권한 오류"),
    );
    return () => stop();
  }, []);

  return { position, error };
}
