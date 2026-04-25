"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/kakao/loadKakaoMaps";
import type { PlaceSearchResult } from "@/types";

const DEFAULT_CENTER = { lat: 37.4979, lng: 127.0276 };

export interface PlacePickerMapProps {
  value: PlaceSearchResult | null;
  onSelect: (place: PlaceSearchResult) => void;
}

export default function PlacePickerMap({ value, onSelect }: PlacePickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const idleHandlerRef = useRef<(() => void) | null>(null);
  const geocoderRef = useRef<kakao.maps.services.Geocoder | null>(null);
  const requestIdRef = useRef(0);
  const [preview, setPreview] = useState<PlaceSearchResult | null>(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    void (async () => {
      if (!containerRef.current || mapRef.current) return;
      const kakao = await loadKakaoMaps();
      if (disposed || !containerRef.current) return;

      const start = value
        ? new kakao.maps.LatLng(value.lat, value.lng)
        : new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);

      const map = new kakao.maps.Map(containerRef.current, {
        center: start,
        level: 4,
        draggable: true,
        disableDoubleClick: true,
        disableDoubleClickZoom: true,
        keyboardShortcuts: false,
      });

      geocoderRef.current = new kakao.maps.services.Geocoder();
      mapRef.current = map;

      const handleIdle = () => {
        const center = map.getCenter();
        void reverseGeocode(center.getLat(), center.getLng());
      };
      idleHandlerRef.current = handleIdle;
      kakao.maps.event.addListener(map, "idle", handleIdle);

      window.setTimeout(() => {
        map.relayout();
        handleIdle();
      }, 0);
    })();

    return () => {
      disposed = true;
      const map = mapRef.current;
      const kakao = window.kakao;
      if (map && kakao && idleHandlerRef.current) {
        kakao.maps.event.removeListener(map, "idle", idleHandlerRef.current);
      }
      mapRef.current = null;
      geocoderRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!value || !mapRef.current || !window.kakao) return;
    const nextCenter = new window.kakao.maps.LatLng(value.lat, value.lng);
    mapRef.current.panTo(nextCenter);
    setPreview(value);
  }, [value?.id, value?.lat, value?.lng]);

  async function reverseGeocode(lat: number, lng: number) {
    const geocoder = geocoderRef.current;
    const kakao = window.kakao;
    if (!geocoder || !kakao) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    await new Promise<void>((resolve) => {
      geocoder.coord2Address(lng, lat, (result, status) => {
        if (requestId !== requestIdRef.current) {
          resolve();
          return;
        }

        if (status !== kakao.maps.services.Status.OK || !result[0]) {
          setPreview({
            id: `coord:${lat.toFixed(6)}:${lng.toFixed(6)}`,
            label: "선택한 위치",
            subLabel: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
          });
          setLoading(false);
          resolve();
          return;
        }

        const first = result[0];
        const road = first.road_address?.address_name?.trim();
        const legal = first.address?.address_name?.trim();
        const building = first.road_address?.building_name?.trim();

        setPreview({
          id: `coord:${lat.toFixed(6)}:${lng.toFixed(6)}`,
          label: building || road || legal || "선택한 위치",
          subLabel:
            [road, legal].filter(Boolean).join(" · ") ||
            `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
        });
        setLoading(false);
        resolve();
      });
    }).catch(() => {
      setError("지도 중심 위치를 읽지 못했습니다.");
      setLoading(false);
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-[var(--text-muted)]">
        지도를 드래그해 중심 핀을 움직이고 목적지를 고를 수 있습니다.
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)]">
        <div ref={containerRef} className="h-64 w-full" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-11 w-11 -translate-y-5 items-center justify-center rounded-full border-4 border-white bg-[var(--accent)] text-lg text-white shadow-[0_16px_32px_rgba(49,130,246,0.28)]">
            📍
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--text-strong)]">
              {preview?.label ?? "지도를 움직여 목적지를 선택하세요."}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              {loading
                ? "현재 지도 중심 좌표를 읽는 중입니다."
                : preview?.subLabel ?? "강남, 성수, 판교처럼 중심을 이동해 선택할 수 있습니다."}
            </div>
            {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
          </div>
          <button
            type="button"
            onClick={() => {
              if (preview) onSelect(preview);
            }}
            disabled={!preview || loading}
            className="shrink-0 rounded-full bg-[var(--text-strong)] px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-300"
          >
            이 위치 선택
          </button>
        </div>
      </div>
    </div>
  );
}
