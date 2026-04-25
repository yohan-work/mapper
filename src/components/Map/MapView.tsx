"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl";
import type { LngLat, LocationPayload, Route } from "@/types";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export interface MapViewProps {
  center?: LngLat;
  destination?: { lng: number; lat: number; label?: string } | null;
  me?: LocationPayload | null;
  peers?: LocationPayload[];
  routes?: Record<string, Route | null>; // userId -> route
  onReady?: (map: MlMap) => void;
  onClick?: (pos: LngLat) => void;
}

export default function MapView({
  center,
  destination,
  me,
  peers = [],
  routes = {},
  onReady,
  onClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const destMarkerRef = useRef<Marker | null>(null);
  const fittedRef = useRef(false);
  const initialCenterAppliedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: center ? [center.lng, center.lat] : [127.0276, 37.4979], // 기본: 서울 강남
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "top-right",
    );
    map.on("load", () => {
      onReady?.(map);
    });
    if (onClick) {
      map.on("click", (e) => onClick({ lng: e.lngLat.lng, lat: e.lngLat.lat }));
    }
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      destMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
    if (destination) {
      const el = document.createElement("div");
      el.className =
        "flex items-center justify-center w-9 h-9 rounded-full bg-rose-500 border-2 border-white shadow-lg text-white text-lg";
      el.innerText = "🏁";
      const m = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);
      if (destination.label) {
        m.setPopup(new maplibregl.Popup({ offset: 18 }).setText(destination.label));
      }
      destMarkerRef.current = m;
    }
  }, [destination?.lat, destination?.lng, destination?.label]);

  // Participant markers (me + peers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const all: LocationPayload[] = [];
    if (me) all.push(me);
    for (const p of peers) all.push(p);

    const seen = new Set<string>();
    for (const p of all) {
      seen.add(p.userId);
      let marker = markersRef.current.get(p.userId);
      if (!marker) {
        const el = document.createElement("div");
        el.style.width = "28px";
        el.style.height = "28px";
        el.style.borderRadius = "50%";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.color = "white";
        el.style.fontSize = "12px";
        el.style.fontWeight = "700";
        el.innerText = p.displayName.slice(0, 1);
        el.style.background = p.color;
        marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([p.lng, p.lat])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setText(p.displayName))
          .addTo(map);
        markersRef.current.set(p.userId, marker);
      } else {
        marker.setLngLat([p.lng, p.lat]);
        const el = marker.getElement();
        el.style.background = p.color;
        el.innerText = p.displayName.slice(0, 1);
      }
    }
    // Remove stale
    for (const [id, m] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    }
  }, [me, peers]);

  // Route layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      // defer
      const t = setTimeout(() => {}, 0);
      const handler = () => applyRoutes(map!, routes);
      if (map) map.once("load", handler);
      return () => clearTimeout(t);
    }
    applyRoutes(map, routes);
  }, [routes]);

  // Auto-fit on first availability of me + destination
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current) return;
    if (me && destination) {
      const bounds = new maplibregl.LngLatBounds(
        [me.lng, me.lat],
        [me.lng, me.lat],
      );
      bounds.extend([destination.lng, destination.lat]);
      for (const p of peers) bounds.extend([p.lng, p.lat]);
      map.fitBounds(bounds, { padding: 80, duration: 800, maxZoom: 15 });
      fittedRef.current = true;
    }
  }, [me, destination, peers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center || destination || fittedRef.current || initialCenterAppliedRef.current) {
      return;
    }
    map.easeTo({
      center: [center.lng, center.lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 900,
    });
    initialCenterAppliedRef.current = true;
  }, [center, destination]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function applyRoutes(map: MlMap, routes: Record<string, Route | null>) {
  const ids = new Set<string>();
  for (const [userId, route] of Object.entries(routes)) {
    const sourceId = `route-${userId}`;
    const layerId = `route-layer-${userId}`;
    ids.add(sourceId);
    if (!route) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      continue;
    }
    const data = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: route.coordinates,
      },
    };
    const existing = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(data as never);
    } else {
      map.addSource(sourceId, { type: "geojson", data: data as never });
      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": colorForUser(userId),
          "line-width": 5,
          "line-opacity": 0.85,
        },
      });
    }
  }
  // cleanup removed users
  const style = map.getStyle();
  for (const s of style.sources ? Object.keys(style.sources) : []) {
    if (s.startsWith("route-") && !ids.has(s)) {
      const layer = s.replace("route-", "route-layer-");
      if (map.getLayer(layer)) map.removeLayer(layer);
      if (map.getSource(s)) map.removeSource(s);
    }
  }
}

function colorForUser(userId: string): string {
  // simple deterministic color
  let h = 0;
  for (let i = 0; i < userId.length; i++)
    h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  const palette = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];
  return palette[h % palette.length];
}
