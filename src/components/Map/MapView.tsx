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
}

export default function MapView({
  center,
  destination,
  me,
  peers = [],
  routes = {},
  selectedMode,
  onReady,
  onClick,
}: MapViewProps) {
  const [mapReady, setMapReady] = useState(false);
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [bicycleEnabled, setBicycleEnabled] = useState(false);
  const [subwayEnabled, setSubwayEnabled] = useState(selectedMode === "subway");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const clickHandlerRef = useRef<((mouseEvent: { latLng: kakao.maps.LatLng }) => void) | null>(
    null,
  );
  const markersRef = useRef<
    Map<string, { marker: kakao.maps.Marker; overlay: kakao.maps.CustomOverlay }>
  >(new Map());
  const routeRef = useRef<Map<string, kakao.maps.Polyline>>(new Map());
  const subwayRef = useRef<
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
      for (const { marker, overlay } of subwayRef.current.values()) {
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
      subwayRef.current.clear();
      destRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedMode === "subway") {
      setSubwayEnabled(true);
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

    const clearStations = () => {
      for (const { marker, overlay } of subwayRef.current.values()) {
        marker.setMap(null);
        overlay.setMap(null);
      }
      subwayRef.current.clear();
    };

    if (!subwayEnabled || !destination) {
      clearStations();
      return;
    }

    let cancelled = false;
    const places = new kakao.maps.services.Places();
    places.categorySearch(
      "SW8",
      (result, status) => {
        if (cancelled) return;
        clearStations();
        if (status !== kakao.maps.services.Status.OK) return;

        for (const station of result.slice(0, 6)) {
          const position = new kakao.maps.LatLng(Number(station.y), Number(station.x));
          const marker = new kakao.maps.Marker({
            map,
            position,
            title: station.place_name,
          });
          const overlay = new kakao.maps.CustomOverlay({
            map,
            position,
            xAnchor: 0.5,
            yAnchor: 1.8,
            content: buildBadge(station.place_name, "station"),
          });
          subwayRef.current.set(station.id, { marker, overlay });
        }
      },
      {
        location: new kakao.maps.LatLng(destination.lat, destination.lng),
        radius: 2200,
        size: 6,
        sort: kakao.maps.services.SortBy.DISTANCE,
      },
    );

    return () => {
      cancelled = true;
    };
  }, [subwayEnabled, destination?.lat, destination?.lng, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!mapReady || !map || !kakao || fittedRef.current) return;

    if (me && destination) {
      const bounds = new kakao.maps.LatLngBounds();
      bounds.extend(new kakao.maps.LatLng(me.lat, me.lng));
      bounds.extend(new kakao.maps.LatLng(destination.lat, destination.lng));
      for (const peer of peers) {
        bounds.extend(new kakao.maps.LatLng(peer.lat, peer.lng));
      }
      map.setBounds(bounds, 80, 80, 80, 80);
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

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setTrafficEnabled((v) => !v)}
          className={`rounded-full border px-3 py-2 text-xs font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.16)] ${
            trafficEnabled
              ? "border-[var(--accent)] bg-white text-[var(--accent)]"
              : "border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
          }`}
        >
          교통
        </button>
        <button
          type="button"
          onClick={() => setBicycleEnabled((v) => !v)}
          className={`rounded-full border px-3 py-2 text-xs font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.16)] ${
            bicycleEnabled
              ? "border-[var(--accent)] bg-white text-[var(--accent)]"
              : "border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
          }`}
        >
          자전거
        </button>
        {selectedMode === "subway" && (
          <button
            type="button"
            onClick={() => setSubwayEnabled((v) => !v)}
            className={`rounded-full border px-3 py-2 text-xs font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.16)] ${
              subwayEnabled
                ? "border-[var(--accent)] bg-white text-[var(--accent)]"
                : "border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
            }`}
          >
            역
          </button>
        )}
      </div>
    </div>
  );
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

function buildBadge(label: string, tone: "destination" | "participant" | "station") {
  const wrapper = document.createElement("div");
  wrapper.className =
    tone === "destination"
      ? "rounded-full border border-[#111827] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
      : tone === "station"
        ? "rounded-full border border-[#0ea5e9] bg-white px-3 py-1.5 text-xs font-semibold text-[#0369a1] shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
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
