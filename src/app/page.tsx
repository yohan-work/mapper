"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import HomeActionSheet from "@/components/Home/HomeActionSheet";
import MyMeetingsPanel from "@/components/Home/MyMeetingsPanel";
import { useMyLocation } from "@/hooks/useMyLocation";
import { ensureSession } from "@/lib/auth";
import {
  getSupabaseBrowser,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
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
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    null,
  );
  const [activeSheet, setActiveSheet] = useState<
    "menu" | "meetings" | "actions" | null
  >(null);
  const [actionPanel, setActionPanel] = useState<"create" | "join">("create");
  const [myUserId, setMyUserId] = useState<string | null>(null);

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
        if (!cancelled) setMyUserId(session.userId);
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
        const meetingIds = Array.from(
          new Set(rows.map((row) => row.meeting_id)),
        ).filter(Boolean);

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
          setHomeError(
            e instanceof Error ? e.message : "약속을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) setLoadingMeetings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRemoveMeeting(meeting: MeetingSummary) {
    if (!myUserId) return;
    try {
      const sb = getSupabaseBrowser();

      const { data: deletedMeetings, error: meetingError } = await sb
        .from("meetings")
        .delete()
        .eq("id", meeting.id)
        .select("id");
      if (meetingError) throw meetingError;

      if (!deletedMeetings || deletedMeetings.length === 0) {
        const { data: deletedParts, error: partError } = await sb
          .from("participants")
          .delete()
          .eq("meeting_id", meeting.id)
          .eq("user_id", myUserId)
          .select("id");
        if (partError) throw partError;
        if (!deletedParts || deletedParts.length === 0) {
          throw new Error("삭제 권한이 없거나 참여 정보를 찾지 못했습니다.");
        }
      }

      setMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
      setSelectedMeetingId((cur) => (cur === meeting.id ? null : cur));
      setHomeError(null);
    } catch (e: unknown) {
      setHomeError(
        e instanceof Error ? e.message : "약속을 제거하지 못했습니다.",
      );
    }
  }

  const selectedMeeting = useMemo(
    () =>
      meetings.find((meeting) => meeting.id === selectedMeetingId) ??
      meetings[0] ??
      null,
    [meetings, selectedMeetingId],
  );

  return (
    <main className="fixed inset-0 h-[100dvh] overflow-hidden bg-[var(--surface-muted)]">
      <MapView
        hideNearby
        hideTopBadges
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

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-auto w-full max-w-lg space-y-2 p-3 pr-[76px] sm:p-4 sm:pr-[76px]">
        <div className="pointer-events-auto rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-card)]">
          <div className="truncate text-sm font-semibold text-[var(--text-strong)] sm:text-base">
            {selectedMeeting
              ? selectedMeeting.title
              : "약속을 골라 바로 참여하세요"}
          </div>
          <div className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)] sm:text-sm">
            {selectedMeeting
              ? selectedMeeting.destination_label
              : position
                ? "현재 위치를 기준으로 지도를 맞췄습니다."
                : "위치 권한을 허용하면 내 위치로 이동합니다."}
          </div>
        </div>

        {homeError && (
          <div className="pointer-events-auto rounded-2xl bg-white px-4 py-3 text-sm text-red-600 shadow-[var(--shadow-card)]">
            {homeError}
          </div>
        )}

        {error && (
          <div className="pointer-events-auto rounded-2xl bg-white px-4 py-3 text-sm text-amber-700 shadow-[var(--shadow-card)]">
            위치 권한이 필요합니다: {error}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setActiveSheet((current) => (current ? null : "menu"))}
        aria-label="약속 메뉴"
        className={`absolute bottom-[calc(env(safe-area-inset-bottom)+20px)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-base font-semibold shadow-[var(--shadow-float)] transition active:scale-95 ${
          activeSheet
            ? "bg-[var(--text-strong)] text-white"
            : "bg-[var(--accent)] text-white"
        }`}
      >
        {activeSheet ? "X" : "Menu"}
      </button>

      {activeSheet && (
        <div
          className="absolute inset-0 z-40 bg-[var(--scrim)]"
          onClick={() => setActiveSheet(null)}
        >
          <div
            className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] mx-auto max-w-lg sm:inset-x-4"
            onClick={(event) => event.stopPropagation()}
          >
            {activeSheet === "menu" && (
              <div className="overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-float)]">
                <div className="flex justify-center pt-2">
                  <div className="h-1.5 w-10 rounded-full bg-[var(--border-soft)]" />
                </div>
                <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
                  <div className="text-lg font-semibold text-[var(--text-strong)]">
                    무엇을 할까요?
                  </div>
                  <div className="mt-1 text-sm text-[var(--text-muted)]">
                    필요한 작업을 아래에서 바로 고르세요.
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <MenuButton
                      title="내 약속"
                      description={
                        loadingMeetings
                          ? "불러오는 중"
                          : meetings.length === 0
                            ? "참여 중인 약속이 없습니다."
                            : `${meetings.length}개의 약속 보기`
                      }
                      onClick={() => setActiveSheet("meetings")}
                    />
                    <MenuButton
                      title="새 약속 만들기"
                      description="빠르게 목적지와 시간을 정하고 방을 만듭니다."
                      onClick={() => {
                        setActionPanel("create");
                        setActiveSheet("actions");
                      }}
                    />
                    <MenuButton
                      title="참여하기"
                      description="링크, 미팅 ID, 참여 코드로 바로 입장합니다."
                      onClick={() => {
                        setActionPanel("join");
                        setActiveSheet("actions");
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSheet === "meetings" && (
              <MyMeetingsPanel
                meetings={meetings}
                loading={loadingMeetings}
                expanded
                myUserId={myUserId}
                selectedMeetingId={selectedMeeting?.id ?? null}
                onSelect={(meetingId) => {
                  setSelectedMeetingId(meetingId);
                  setActiveSheet(null);
                }}
                onToggle={() => setActiveSheet(null)}
                onRemove={handleRemoveMeeting}
              />
            )}

            {activeSheet === "actions" && (
              <HomeActionSheet
                expanded
                initialPanel={actionPanel}
                onToggle={() => setActiveSheet(null)}
              />
            )}
          </div>
        </div>
      )}
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

  const aTime = a.scheduled_at
    ? new Date(a.scheduled_at).getTime()
    : Number.MAX_SAFE_INTEGER;
  const bTime = b.scheduled_at
    ? new Date(b.scheduled_at).getTime()
    : Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;

  return (b.joined_at ?? "").localeCompare(a.joined_at ?? "");
}

function MenuButton({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-[var(--surface-muted)] px-4 py-4 text-left transition active:bg-[#e8ebee]"
    >
      <div className="text-sm font-semibold text-[var(--text-strong)]">
        {title}
      </div>
      <div className="mt-1 text-sm text-[var(--text-muted)]">{description}</div>
    </button>
  );
}
