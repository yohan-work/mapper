export interface Position {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
}

export function watchPosition(
  onUpdate: (pos: Position) => void,
  onError?: (err: GeolocationPositionError) => void,
): () => void {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    onError?.({
      code: 2,
      message: "Geolocation unsupported",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as GeolocationPositionError);
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (p) => {
      onUpdate({
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        heading: Number.isFinite(p.coords.heading ?? NaN)
          ? (p.coords.heading as number)
          : null,
        speed: Number.isFinite(p.coords.speed ?? NaN)
          ? (p.coords.speed as number)
          : null,
        accuracy: p.coords.accuracy,
        timestamp: p.timestamp,
      });
    },
    (err) => onError?.(err),
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000,
    },
  );
  return () => navigator.geolocation.clearWatch(id);
}

// Haversine 거리 (미터)
export function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
