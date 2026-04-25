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
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
      <div className="mx-auto max-w-lg px-3 pb-3 pointer-events-auto">
        <div className="rounded-2xl bg-slate-900/95 backdrop-blur border border-slate-800 shadow-2xl">
          <button
            className="w-full flex items-center justify-between px-4 py-3"
            onClick={() => setExpanded((v) => !v)}
          >
            <div className="text-left min-w-0">
              <div className="text-sm text-slate-400">목적지</div>
              <div className="font-semibold truncate">{title}</div>
              <div className="text-xs text-slate-400 truncate">
                {destinationLabel}
              </div>
              {myMode === "subway" && (
                <div className="mt-1 text-[11px] text-sky-300">지하철 추천 경로 베타</div>
              )}
              {(visibility || joinCode) && (
                <div className="mt-1 flex gap-2 text-[11px] text-slate-500">
                  {visibility && <span>{visibility === "public" ? "공개 약속" : "비공개 약속"}</span>}
                  {joinCode && <span>참여 코드 {joinCode}</span>}
                </div>
              )}
            </div>
            <span className="text-slate-400 text-sm">{expanded ? "▼" : "▲"}</span>
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onChangeMode(m.id)}
                    className={`flex-1 py-2 rounded-lg text-sm border transition ${
                      myMode === m.id
                        ? "bg-brand border-brand text-white"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <span className="mr-1">{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="divide-y divide-slate-800">
                {rows.length === 0 && (
                  <div className="py-4 text-sm text-slate-400 text-center">
                    위치를 받는 중…
                  </div>
                )}
                {rows.map((r) => (
                  <EtaCard key={r.userId} row={r} />
                ))}
              </div>

              <button
                onClick={onShare}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium border border-slate-700"
              >
                🔗 링크/코드 공유
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
