"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import HomeActionSheet from "@/components/Home/HomeActionSheet";
import MyMeetingsPanel from "@/components/Home/MyMeetingsPanel";
import { useMyLocation } from "@/hooks/useMyLocation";
import { ensureSession } from "@/lib/auth";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { MeetingSummary } from "@/types";

const MapView = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-slate-400">
      지도 로딩 중…
    </div>
  ),
});

function HomeMapContent() {
  const { position, error } = useMyLocation();
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<"meetings" | "actions" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isSupabaseConfigured()) {
          throw new Error(
            "Supabase 환경변수가 없습니다. .env.local 을 설정하고 서버를 재시작하세요.",
          );
        }
        const session = await ensureSession();
        const sb = getSupabaseBrowser();
        const { data: participantRows, error: participantError } = await sb
          .from("participants")
          .select("meeting_id, joined_at")
          .eq("user_id", session.userId);
        if (participantError) throw participantError;

        const rows = (participantRows ?? []) as Array<{
          meeting_id: string;
          joined_at: string;
        }>;
        const meetingIds = Array.from(new Set(rows.map((row) => row.meeting_id))).filter(Boolean);

        if (meetingIds.length === 0) {
          if (!cancelled) {
            setMeetings([]);
            setSelectedMeetingId(null);
          }
          return;
        }

        const { data: meetingRows, error: meetingError } = await sb
          .from("meetings")
          .select("*")
          .in("id", meetingIds);
        if (meetingError) throw meetingError;

        const joinedAtByMeetingId = new Map(
          rows.map((row) => [row.meeting_id, row.joined_at] as const),
        );

        const next = ((meetingRows ?? []) as MeetingSummary[])
          .flatMap((meeting) => {
            if (!meeting || meeting.status === "closed") return [];
            return [
              {
                ...meeting,
                joined_at: joinedAtByMeetingId.get(meeting.id),
              },
            ];
          })
          .sort(sortMeetings);

        if (!cancelled) {
          setMeetings(next);
          setSelectedMeetingId((current) => current ?? next[0]?.id ?? null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setHomeError(e instanceof Error ? e.message : "약속을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoadingMeetings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === selectedMeetingId) ?? meetings[0] ?? null,
    [meetings, selectedMeetingId],
  );

  return (
    <main className="fixed inset-0 overflow-hidden bg-slate-950">
      <MapView
        center={
          selectedMeeting
            ? {
                lat: selectedMeeting.destination_lat,
                lng: selectedMeeting.destination_lng,
              }
            : (position ?? undefined)
        }
        destination={
          selectedMeeting
            ? {
                lat: selectedMeeting.destination_lat,
                lng: selectedMeeting.destination_lng,
                label: selectedMeeting.destination_label,
              }
            : null
        }
        me={
          position
            ? {
                userId: "me",
                displayName: "나",
                color: "#0ea5e9",
                lat: position.lat,
                lng: position.lng,
                heading: position.heading,
                speed: position.speed,
                accuracy: position.accuracy,
                travelMode: "walking",
                updatedAt: position.timestamp,
              }
            : null
        }
      />
      <div className="pointer-events-none absolute inset-0 bg-black/8" />
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-4">
        <div className="pointer-events-none mx-auto w-full max-w-lg space-y-3">
          <div className="pointer-events-auto rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Live Map Lobby
            </div>
            <div className="mt-2 text-sm font-medium text-[var(--text-strong)]">
              {selectedMeeting
                ? `선택한 약속: ${selectedMeeting.title}`
                : position
                  ? "현재 위치를 기준으로 지도를 맞췄습니다."
                  : "위치 권한을 허용하면 내 위치를 중심으로 지도가 이동합니다."}
            </div>
          </div>

          {homeError && (
            <div className="pointer-events-auto rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600 shadow-[0_8px_24px_rgba(15,23,42,0.1)]">
              {homeError}
            </div>
          )}

          {error && (
            <div className="pointer-events-auto rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-700 shadow-[0_8px_24px_rgba(15,23,42,0.1)]">
              위치 권한이 필요합니다: {error}
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-lg space-y-3">
          <MyMeetingsPanel
            meetings={meetings}
            loading={loadingMeetings}
            expanded={expandedPanel === "meetings"}
            selectedMeetingId={selectedMeeting?.id ?? null}
            onSelect={setSelectedMeetingId}
            onToggle={() =>
              setExpandedPanel((current) => (current === "meetings" ? null : "meetings"))
            }
          />
          <HomeActionSheet
            expanded={expandedPanel === "actions"}
            onToggle={() =>
              setExpandedPanel((current) => (current === "actions" ? null : "actions"))
            }
          />
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return <HomeMapContent />;
}

function sortMeetings(a: MeetingSummary, b: MeetingSummary) {
  const rank = (meeting: MeetingSummary) => {
    if (meeting.status === "active") return 0;
    if (meeting.status === "scheduled") return 1;
    return 2;
  };
  const rankDiff = rank(a) - rank(b);
  if (rankDiff !== 0) return rankDiff;

  const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;

  return (b.joined_at ?? "").localeCompare(a.joined_at ?? "");
}
