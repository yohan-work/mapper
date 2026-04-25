"use client";

import { useState } from "react";
import type { TravelMode } from "@/types";
import EtaCard, { type EtaRow } from "./EtaCard";

export interface BottomSheetProps {
  title: string;
  destinationLabel: string;
  visibility?: "private" | "public";
  joinCode?: string | null;
  myMode: TravelMode;
  onChangeMode: (mode: TravelMode) => void;
  rows: EtaRow[];
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
  onShare,
}: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20">
      <div className="pointer-events-auto mx-auto max-w-lg">
        <div className="overflow-hidden rounded-t-3xl bg-white shadow-[var(--shadow-float)]">
          <button
            className="flex w-full items-center gap-3 px-4 pb-3 pt-2"
            onClick={() => setExpanded((v) => !v)}
          >
            <div className="flex-1 min-w-0 text-left">
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
              <div className="mt-2 text-sm font-semibold text-[var(--text-strong)]">
                {rows[0]?.route
                  ? `${rows[0].travelMode === "subway" ? "지하철" : rows[0].travelMode === "driving" ? "자동차" : rows[0].travelMode === "walking" ? "도보" : "자전거"} · ${
                      rows[0].arrived ? "도착 완료" : "ETA 확인"
                    }`
                  : "위치를 받는 중"}
              </div>
            </div>
          </button>

          {expanded && (
            <div className="space-y-3 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onChangeMode(m.id)}
                    className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                      myMode === m.id
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                    }`}
                  >
                    <span className="mr-1">{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
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
