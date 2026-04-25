"use client";

import { useState } from "react";
import { formatDistance, formatEta } from "@/lib/geo/osrm";
import type { Route, TravelMode } from "@/types";
import EtaCard, { type EtaRow } from "./EtaCard";

export interface BottomSheetProps {
  title: string;
  destinationLabel: string;
  visibility?: "private" | "public";
  joinCode?: string | null;
  myMode: TravelMode;
  onChangeMode: (mode: TravelMode) => void;
  rows: EtaRow[];
  modeEtas?: Record<TravelMode, Route | null>;
  onShare: () => void;
}

const MODES: { id: TravelMode; label: string; emoji: string }[] = [
  { id: "driving", label: "자동차", emoji: "🚗" },
  { id: "walking", label: "도보", emoji: "🚶" },
  { id: "cycling", label: "자전거", emoji: "🚴" },
  { id: "subway", label: "지하철", emoji: "🚇" },
];

export default function BottomSheet({
  title,
  destinationLabel,
  visibility,
  joinCode,
  myMode,
  onChangeMode,
  rows,
  modeEtas,
  onShare,
}: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20">
      <div className="pointer-events-auto mx-auto max-w-lg">
        <div className="overflow-hidden rounded-t-3xl bg-white shadow-[var(--shadow-float)]">
          <button
            type="button"
            className="w-full px-4 pb-2 pt-2 text-left"
            onClick={() => setExpanded((v) => !v)}
          >
            <div className="flex justify-center pb-2">
              <div className="h-1.5 w-10 rounded-full bg-[var(--border-soft)]" />
            </div>
            <div className="truncate text-lg font-semibold text-[var(--text-strong)]">
              {title}
            </div>
            <div className="truncate text-xs text-[var(--text-muted)]">
              {destinationLabel}
            </div>
            {myMode === "subway" && (
              <div className="mt-1 text-[11px] font-semibold text-[var(--accent)]">
                지하철 추천 경로 베타
              </div>
            )}
            {(visibility || joinCode) && (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--text-muted)]">
                {visibility && (
                  <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1">
                    {visibility === "public" ? "공개 약속" : "비공개 약속"}
                  </span>
                )}
                {joinCode && (
                  <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1">
                    참여 코드 {joinCode}
                  </span>
                )}
              </div>
            )}
          </button>

          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
            {MODES.map((m) => {
              const route = modeEtas?.[m.id] ?? null;
              const active = myMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeMode(m.id)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-left transition ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--text-strong)]"
                  }`}
                >
                  <div className="text-xs font-semibold">
                    <span className="mr-1">{m.emoji}</span>
                    {m.label}
                  </div>
                  <div
                    className={`mt-0.5 text-[11px] ${active ? "text-white/90" : "text-[var(--text-muted)]"}`}
                  >
                    {route
                      ? `${formatEta(route.durationSeconds)} · ${formatDistance(route.distanceMeters)}`
                      : "계산 중"}
                  </div>
                </button>
              );
            })}
          </div>

          {expanded && (
            <div className="space-y-3 border-t border-[var(--border-soft)] px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
              <div className="max-h-[40vh] space-y-2 overflow-y-auto">
                {rows.length === 0 && (
                  <div className="rounded-2xl bg-[var(--surface-muted)] py-4 text-center text-sm text-[var(--text-muted)]">
                    위치를 받는 중…
                  </div>
                )}
                {rows.map((r) => (
                  <EtaCard key={r.userId} row={r} />
                ))}
              </div>

              <button
                onClick={onShare}
                className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition active:bg-[var(--accent-strong)]"
              >
                링크/코드 공유
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
