"use client";

import { useEffect, useRef, useState } from "react";
import { watchPosition, type Position } from "@/lib/geo/geolocation";

const LAST_POSITION_KEY = "mapper:last-position";

export function useMyLocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const cached = readLastPosition();
    if (cached) {
      setPosition(cached);
    }

    const startWatch = () => {
      stopRef.current?.();
      stopRef.current = watchPosition(
        (p) => {
          setPosition(p);
          setError(null);
          try {
            window.localStorage.setItem(LAST_POSITION_KEY, JSON.stringify(p));
          } catch {}
        },
        (err) => setError(err.message || "위치 권한 오류"),
      );
    };

    const resumeWatch = () => {
      if (document.visibilityState === "hidden") return;
      startWatch();
    };

    startWatch();
    window.addEventListener("focus", resumeWatch);
    window.addEventListener("pageshow", resumeWatch);
    document.addEventListener("visibilitychange", resumeWatch);

    return () => {
      stopRef.current?.();
      stopRef.current = null;
      window.removeEventListener("focus", resumeWatch);
      window.removeEventListener("pageshow", resumeWatch);
      document.removeEventListener("visibilitychange", resumeWatch);
    };
  }, []);

  return { position, error };
}

function readLastPosition(): Position | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Position | null;
    if (!parsed || typeof parsed.lat !== "number" || typeof parsed.lng !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
