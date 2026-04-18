"use client";

import { formatDistance, formatEta } from "@/lib/geo/osrm";
import type { LocationPayload, Route, TravelMode } from "@/types";

export interface EtaRow {
  userId: string;
  displayName: string;
  color: string;
  travelMode: TravelMode;
  route: Route | null;
  arrived: boolean;
  isMe: boolean;
}

export default function EtaCard({ row }: { row: EtaRow }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background: row.color }}
      >
        {row.displayName.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {row.displayName}
            {row.isMe && <span className="text-slate-400 ml-1">(나)</span>}
          </span>
          <span className="text-xs">{modeEmoji(row.travelMode)}</span>
        </div>
        <div className="text-xs text-slate-400">
          {row.arrived
            ? "도착 완료"
            : row.route
              ? `${formatEta(row.route.durationSeconds)} · ${formatDistance(row.route.distanceMeters)}`
              : "경로 계산 중…"}
        </div>
      </div>
    </div>
  );
}

function modeEmoji(mode: TravelMode) {
  return mode === "driving" ? "🚗" : mode === "walking" ? "🚶" : "🚴";
}

export function locationsToRows(
  me: LocationPayload | null,
  peers: LocationPayload[],
  routes: Record<string, Route | null>,
  arrivedSet: Set<string>,
  myUserId: string,
): EtaRow[] {
  const rows: EtaRow[] = [];
  if (me) {
    rows.push({
      userId: me.userId,
      displayName: me.displayName,
      color: me.color,
      travelMode: me.travelMode,
      route: routes[me.userId] ?? null,
      arrived: arrivedSet.has(me.userId),
      isMe: true,
    });
  }
  for (const p of peers) {
    rows.push({
      userId: p.userId,
      displayName: p.displayName,
      color: p.color,
      travelMode: p.travelMode,
      route: routes[p.userId] ?? null,
      arrived: arrivedSet.has(p.userId),
      isMe: p.userId === myUserId,
    });
  }
  return rows;
}
