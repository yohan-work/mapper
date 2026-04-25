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
  const subtitle = row.route
    ? `${formatEta(row.route.durationSeconds)} · ${formatDistance(row.route.distanceMeters)}${row.route.isEstimated ? " · 추정" : ""}`
    : "경로 계산 중…";
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-[var(--border-soft)] bg-white px-3 py-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/20 text-xs font-bold text-white"
        style={{ background: row.color }}
      >
        {row.displayName.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-[var(--text-strong)]">
            {row.displayName}
            {row.isMe && <span className="ml-1 text-[var(--text-soft)]">(나)</span>}
          </span>
          <span className="text-xs">{modeEmoji(row.travelMode)}</span>
        </div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">
          {row.arrived ? "도착 완료" : subtitle}
        </div>
        {!row.arrived && row.route?.summaryLabel && (
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">{row.route.summaryLabel}</div>
        )}
        {!row.arrived && row.route?.detailLabel && (
          <div className="mt-1 text-[11px] text-[var(--text-soft)]">{row.route.detailLabel}</div>
        )}
      </div>
    </div>
  );
}

function modeEmoji(mode: TravelMode) {
  return mode === "driving"
    ? "🚗"
    : mode === "walking"
      ? "🚶"
      : mode === "cycling"
        ? "🚴"
        : "🚇";
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
