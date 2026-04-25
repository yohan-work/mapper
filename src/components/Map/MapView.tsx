"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/kakao/loadKakaoMaps";
import type { LngLat, LocationPayload, Route, TravelMode } from "@/types";

export interface MapViewProps {
  center?: LngLat;
  destination?: { lng: number; lat: number; label?: string } | null;
  me?: LocationPayload | null;
  peers?: LocationPayload[];
  routes?: Record<string, Route | null>;
  selectedMode?: TravelMode;
  onReady?: (map: kakao.maps.Map) => void;
  onClick?: (pos: LngLat) => void;
  hideOverlays?: boolean;
  hideNearby?: boolean;
  hideTopBadges?: boolean;
}

type NearbyCategory = "SW8" | "CE7" | "FD6" | "PK6";

type NearbyPlace = {
  id: string;
  label: string;
  subLabel: string;
  lat: number;
  lng: number;
};

const CATEGORY_META: Record<
  NearbyCategory,
  { label: string; badgeTone: "station" | "poi" }
> = {
  SW8: { label: "지하철역", badgeTone: "station" },
  CE7: { label: "카페", badgeTone: "poi" },
  FD6: { label: "식당", badgeTone: "poi" },
  PK6: { label: "주차장", badgeTone: "poi" },
};

export default function MapView({
  center,
  destination,
  me,
  peers = [],
  routes = {},
  selectedMode,
  onReady,
  onClick,
  hideOverlays = false,
  hideNearby = false,
  hideTopBadges = false,
}: MapViewProps) {
  const [mapReady, setMapReady] = useState(false);
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [bicycleEnabled, setBicycleEnabled] = useState(false);
  const [activeNearbyCategory, setActiveNearbyCategory] = useState<NearbyCategory | null>(
    selectedMode === "subway" ? "SW8" : "CE7",
  );
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const clickHandlerRef = useRef<((mouseEvent: { latLng: kakao.maps.LatLng }) => void) | null>(
    null,
  );
  const markersRef = useRef<
    Map<string, { marker: kakao.maps.Marker; overlay: kakao.maps.CustomOverlay }>
  >(new Map());
  const routeRef = useRef<Map<string, kakao.maps.Polyline>>(new Map());
  const nearbyRef = useRef<
    Map<string, { marker: kakao.maps.Marker; overlay: kakao.maps.CustomOverlay }>
  >(new Map());
  const destRef = useRef<{
    marker: kakao.maps.Marker;
    overlay: kakao.maps.CustomOverlay | null;
  } | null>(null);
  const fittedRef = useRef(false);
  const initialCenterAppliedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    void (async () => {
      const kakao = await loadKakaoMaps();
      if (disposed || !containerRef.current) return;

      const initialCenter = center
        ? new kakao.maps.LatLng(center.lat, center.lng)
        : new kakao.maps.LatLng(37.4979, 127.0276);

      const map = new kakao.maps.Map(containerRef.current, {
        center: initialCenter,
        level: 5,
      });

      map.addOverlayMapTypeId(kakao.maps.MapTypeId.TRAFFIC);
      mapRef.current = map;
      setMapReady(true);

      if (onClick) {
        const handler = (mouseEvent: { latLng: kakao.maps.LatLng }) => {
          onClick({
            lng: mouseEvent.latLng.getLng(),
            lat: mouseEvent.latLng.getLat(),
          });
        };
        clickHandlerRef.current = handler;
        kakao.maps.event.addListener(map, "click", handler);
      }

      window.setTimeout(() => {
        map.relayout();
        onReady?.(map);
      }, 0);
    })();

    return () => {
      disposed = true;
      const map = mapRef.current;
      const kakao = window.kakao;
      if (map && kakao && clickHandlerRef.current) {
        kakao.maps.event.removeListener(map, "click", clickHandlerRef.current);
      }
      for (const { marker, overlay } of markersRef.current.values()) {
        marker.setMap(null);
        overlay.setMap(null);
      }
      for (const polyline of routeRef.current.values()) {
        polyline.setMap(null);
      }
      for (const { marker, overlay } of nearbyRef.current.values()) {
        marker.setMap(null);
        overlay.setMap(null);
      }
      if (destRef.current) {
        destRef.current.marker.setMap(null);
        destRef.current.overlay?.setMap(null);
      }
      mapRef.current = null;
      setMapReady(false);
      markersRef.current.clear();
      routeRef.current.clear();
      nearbyRef.current.clear();
      destRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedMode === "subway") {
      setActiveNearbyCategory("SW8");
    }
  }, [selectedMode]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!mapReady || !map || !kakao) return;

    if (trafficEnabled) {
      map.addOverlayMapTypeId(kakao.maps.MapTypeId.TRAFFIC);
    } else {
      map.removeOverlayMapTypeId(kakao.maps.MapTypeId.TRAFFIC);
    }

    if (bicycleEnabled) {
      map.addOverlayMapTypeId(kakao.maps.MapTypeId.BICYCLE);
    } else {
      map.removeOverlayMapTypeId(kakao.maps.MapTypeId.BICYCLE);
    }
  }, [trafficEnabled, bicycleEnabled, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!mapReady || !map || !kakao) return;

    if (destRef.current) {
      destRef.current.marker.setMap(null);
      destRef.current.overlay?.setMap(null);
      destRef.current = null;
    }

    if (!destination) return;

    const position = new kakao.maps.LatLng(destination.lat, destination.lng);
    const marker = new kakao.maps.Marker({
      map,
      position,
      title: destination.label ?? "목적지",
    });
    const overlay = destination.label
      ? new kakao.maps.CustomOverlay({
          map,
          position,
          xAnchor: 0.5,
          yAnchor: 1.65,
          content: buildBadge(destination.label, "destination"),
        })
      : null;

    destRef.current = { marker, overlay };
  }, [destination?.lat, destination?.lng, destination?.label, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!mapReady || !map || !kakao) return;

    const all: LocationPayload[] = [];
    if (me) all.push(me);
    for (const peer of peers) all.push(peer);

    const seen = new Set<string>();
    for (const participant of all) {
      seen.add(participant.userId);
      const position = new kakao.maps.LatLng(participant.lat, participant.lng);
      let entry = markersRef.current.get(participant.userId);

      if (!entry) {
        entry = {
          marker: new kakao.maps.Marker({
            map,
            position,
            title: participant.displayName,
          }),
          overlay: new kakao.maps.CustomOverlay({
            map,
            position,
            xAnchor: 0.5,
            yAnchor: 2.4,
            content: buildParticipantChip(participant),
          }),
        };
        markersRef.current.set(participant.userId, entry);
      } else {
        entry.marker.setPosition(position);
        entry.marker.setTitle(participant.displayName);
        entry.overlay.setPosition(position);
        entry.overlay.setContent(buildParticipantChip(participant));
      }
    }

    for (const [userId, entry] of markersRef.current.entries()) {
      if (!seen.has(userId)) {
        entry.marker.setMap(null);
        entry.overlay.setMap(null);
        markersRef.current.delete(userId);
      }
    }
  }, [me, peers, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!mapReady || !map || !kakao) return;
    applyRoutes(kakao, map, routeRef.current, routes);
  }, [routes, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!mapReady || !map || !kakao) return;

    const clearNearby = () => {
      for (const { marker, overlay } of nearbyRef.current.values()) {
        marker.setMap(null);
        overlay.setMap(null);
      }
      nearbyRef.current.clear();
      setNearbyPlaces([]);
    };

    if (!destination || !activeNearbyCategory) {
      clearNearby();
      return;
    }

    let cancelled = false;
    setNearbyLoading(true);
    const places = new kakao.maps.services.Places();
    places.categorySearch(
      activeNearbyCategory,
      (result, status) => {
        if (cancelled) return;
        clearNearby();
        setNearbyLoading(false);
        if (status !== kakao.maps.services.Status.OK) return;

        const nextPlaces = result.slice(0, 5).map((place) => ({
          id: place.id,
          label: place.place_name,
          subLabel: place.road_address_name || place.address_name || "",
          lat: Number(place.y),
          lng: Number(place.x),
        }));

        setNearbyPlaces(nextPlaces);
        for (const place of nextPlaces) {
          const position = new kakao.maps.LatLng(place.lat, place.lng);
          const marker = new kakao.maps.Marker({
            map,
            position,
            title: place.label,
          });
          const overlay = new kakao.maps.CustomOverlay({
            map,
            position,
            xAnchor: 0.5,
            yAnchor: 1.8,
            content: buildBadge(place.label, CATEGORY_META[activeNearbyCategory].badgeTone),
          });
          nearbyRef.current.set(place.id, { marker, overlay });
        }
      },
      {
        location: new kakao.maps.LatLng(destination.lat, destination.lng),
        radius: activeNearbyCategory === "PK6" ? 3000 : 2200,
        size: 5,
        sort: kakao.maps.services.SortBy.DISTANCE,
      },
    );

    return () => {
      cancelled = true;
    };
  }, [activeNearbyCategory, destination?.lat, destination?.lng, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!mapReady || !map || !kakao || fittedRef.current) return;

    if (me && destination) {
      fitToMeeting();
      fittedRef.current = true;
    }
  }, [me, destination, peers, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (
      !mapReady ||
      !map ||
      !kakao ||
      !center ||
      destination ||
      fittedRef.current ||
      initialCenterAppliedRef.current
    ) {
      return;
    }

    map.setLevel(Math.min(map.getLevel(), 4));
    map.panTo(new kakao.maps.LatLng(center.lat, center.lng));
    initialCenterAppliedRef.current = true;
  }, [center, destination, mapReady]);

  function panToTarget(next: LngLat) {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!map || !kakao) return;
    map.panTo(new kakao.maps.LatLng(next.lat, next.lng));
  }

  function fitToMeeting() {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!map || !kakao || !destination) return;

    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(new kakao.maps.LatLng(destination.lat, destination.lng));
    if (me) {
      bounds.extend(new kakao.maps.LatLng(me.lat, me.lng));
    }
    for (const peer of peers) {
      bounds.extend(new kakao.maps.LatLng(peer.lat, peer.lng));
    }
    map.setBounds(bounds, 120, 80, 320, 80);
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {!hideOverlays && !hideTopBadges && (
        <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-6rem)] flex-wrap gap-2 sm:left-4 sm:top-4 sm:max-w-[calc(100%-7rem)]">
          {destination && (
            <div className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[var(--text-strong)] shadow-[var(--shadow-card)]">
              {destination.label ?? "목적지"}
            </div>
          )}
          {selectedMode && (
            <div className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[var(--accent)] shadow-[var(--shadow-card)]">
              {modeLabel(selectedMode)}
            </div>
          )}
        </div>
      )}

      {!hideOverlays && (
        <>
          <div className="absolute right-3 top-14 z-10 hidden flex-col gap-2 sm:right-4 sm:top-4 sm:flex">
            <div className="pointer-events-auto rounded-2xl bg-white p-2 shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-2">
                <MapControlButton
                  active={trafficEnabled}
                  label="교통"
                  onClick={() => setTrafficEnabled((value) => !value)}
                />
                <MapControlButton
                  active={bicycleEnabled}
                  label="자전거"
                  onClick={() => setBicycleEnabled((value) => !value)}
                />
              </div>
            </div>
            <div className="pointer-events-auto rounded-2xl bg-white p-2 shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-2">
                {me && <MapControlButton label="내 위치" onClick={() => panToTarget(me)} />}
                {destination && (
                  <MapControlButton
                    label="전체 보기"
                    onClick={() => {
                      fitToMeeting();
                      fittedRef.current = true;
                    }}
                  />
                )}
                {destination && !hideNearby && (
                  <MapControlButton
                    active={nearbyOpen}
                    label="주변"
                    onClick={() => setNearbyOpen((v) => !v)}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="pointer-events-auto absolute right-3 top-14 z-10 flex flex-col gap-2 sm:hidden">
            <div className="rounded-2xl bg-white p-1.5 shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-1.5">
                <MapControlButton
                  active={trafficEnabled}
                  label="교통"
                  onClick={() => setTrafficEnabled((value) => !value)}
                />
                <MapControlButton
                  active={bicycleEnabled}
                  label="자전거"
                  onClick={() => setBicycleEnabled((value) => !value)}
                />
                {me && <MapControlButton label="내 위치" onClick={() => panToTarget(me)} />}
                {destination && (
                  <MapControlButton
                    label="전체"
                    onClick={() => {
                      fitToMeeting();
                      fittedRef.current = true;
                    }}
                  />
                )}
                {destination && !hideNearby && (
                  <MapControlButton
                    active={nearbyOpen}
                    label="주변"
                    onClick={() => setNearbyOpen((v) => !v)}
                  />
                )}
              </div>
            </div>
          </div>

          {destination && !hideNearby && nearbyOpen && (
            <div
              className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-[var(--scrim)] sm:items-center"
              onClick={() => setNearbyOpen(false)}
            >
              <div
                className="mx-3 mb-3 w-full max-w-lg rounded-3xl bg-white p-4 shadow-[var(--shadow-float)] sm:mx-0 sm:mb-0 sm:w-[min(420px,calc(100%-2rem))]"
                onClick={(e) => e.stopPropagation()}
              >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-strong)] sm:text-base">
                    목적지 주변 빠른 탐색
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
                    카카오 장소 카테고리로 바로 확인합니다.
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fitToMeeting()}
                    className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]"
                  >
                    약속 기준
                  </button>
                  <button
                    type="button"
                    onClick={() => setNearbyOpen(false)}
                    aria-label="닫기"
                    className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]"
                  >
                    닫기
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_META) as NearbyCategory[]).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveNearbyCategory(category)}
                    className={`rounded-full px-3 py-2 text-[11px] font-semibold transition sm:text-xs ${
                      activeNearbyCategory === category
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                    }`}
                  >
                    {CATEGORY_META[category].label}
                  </button>
                ))}
              </div>

              <div className="mt-3 space-y-2">
                {nearbyLoading && (
                  <div className="rounded-2xl bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-muted)]">
                    주변 장소를 불러오는 중…
                  </div>
                )}

                {!nearbyLoading && nearbyPlaces.length === 0 && (
                  <div className="rounded-2xl bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-muted)]">
                    주변 장소가 없거나 아직 불러오지 못했습니다.
                  </div>
                )}

                {!nearbyLoading &&
                  nearbyPlaces.slice(0, 2).map((place, index) => (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => panToTarget(place)}
                      className="flex w-full items-center justify-between rounded-2xl bg-[var(--surface-muted)] px-3 py-3 text-left transition active:bg-[#e8ebee]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--text-strong)]">
                          {place.label}
                        </div>
                        <div className="mt-1 truncate text-xs text-[var(--text-muted)]">
                          {place.subLabel || CATEGORY_META[activeNearbyCategory ?? "CE7"].label}
                        </div>
                      </div>
                      <span className="ml-3 shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
                        {index + 1}
                      </span>
                    </button>
                  ))}
              </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MapControlButton({
  active = false,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
        active
          ? "bg-[var(--accent)] text-white"
          : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
      }`}
    >
      {label}
    </button>
  );
}

function modeLabel(mode: TravelMode) {
  return mode === "driving"
    ? "자동차"
    : mode === "walking"
      ? "도보"
      : mode === "cycling"
        ? "자전거"
        : "지하철";
}

function applyRoutes(
  kakao: typeof window.kakao,
  map: kakao.maps.Map,
  routeRef: Map<string, kakao.maps.Polyline>,
  routes: Record<string, Route | null>,
) {
  const seen = new Set<string>();

  for (const [userId, route] of Object.entries(routes)) {
    seen.add(userId);
    const existing = routeRef.get(userId);

    if (!route) {
      existing?.setMap(null);
      routeRef.delete(userId);
      continue;
    }

    const path = route.coordinates.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng));
    if (existing) {
      existing.setPath(path);
      existing.setOptions({
        map,
        path,
        strokeWeight: 5,
        strokeColor: colorForUser(userId),
        strokeOpacity: 0.85,
        strokeStyle: "solid",
      });
    } else {
      routeRef.set(
        userId,
        new kakao.maps.Polyline({
          map,
          path,
          strokeWeight: 5,
          strokeColor: colorForUser(userId),
          strokeOpacity: 0.85,
          strokeStyle: "solid",
        }),
      );
    }
  }

  for (const [userId, polyline] of routeRef.entries()) {
    if (!seen.has(userId)) {
      polyline.setMap(null);
      routeRef.delete(userId);
    }
  }
}

function buildBadge(label: string, tone: "destination" | "station" | "poi") {
  const wrapper = document.createElement("div");
  wrapper.className =
    tone === "destination"
      ? "rounded-full border border-[#111827] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
      : tone === "station"
        ? "rounded-full border border-[#3182f6] bg-[#eff6ff] px-3 py-1.5 text-xs font-semibold text-[#1b64da] shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
        : "rounded-full border border-[#dbe2ea] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] shadow-[0_10px_24px_rgba(15,23,42,0.16)]";
  wrapper.textContent = label;
  return wrapper;
}

function buildParticipantChip(participant: LocationPayload) {
  const wrapper = document.createElement("div");
  wrapper.className =
    "flex items-center gap-2 rounded-full border border-[#dbe2ea] bg-white px-2.5 py-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.16)]";

  const dot = document.createElement("span");
  dot.className =
    "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white";
  dot.style.backgroundColor = participant.color;
  dot.textContent = participant.displayName.slice(0, 1).toUpperCase();

  const label = document.createElement("span");
  label.className = "text-xs font-semibold text-[#111827]";
  label.textContent = participant.displayName;

  wrapper.appendChild(dot);
  wrapper.appendChild(label);
  return wrapper;
}

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const palette = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#0ea5e9",
    "#6366f1",
    "#ec4899",
  ];
  return palette[hash % palette.length];
}
