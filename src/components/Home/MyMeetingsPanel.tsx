"use client";

import type { MeetingSummary } from "@/types";

export interface MyMeetingsPanelProps {
  meetings: MeetingSummary[];
  selectedMeetingId: string | null;
  loading?: boolean;
  expanded?: boolean;
  myUserId?: string | null;
  onSelect: (meetingId: string) => void;
  onToggle: () => void;
  onRemove?: (meeting: MeetingSummary) => void | Promise<void>;
}

export default function MyMeetingsPanel({
  meetings,
  selectedMeetingId,
  loading,
  expanded = false,
  myUserId,
  onSelect,
  onToggle,
  onRemove,
}: MyMeetingsPanelProps) {
  const selectedMeeting =
    meetings.find((meeting) => meeting.id === selectedMeetingId) ?? meetings[0] ?? null;

  return (
    <section className="flex max-h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-float)]">
      <div className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">내 약속</h2>
            <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
              {loading ? "불러오는 중" : `${meetings.length}개`}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
            {loading
              ? "약속을 불러오는 중입니다."
              : meetings.length === 0
                ? "참여 중인 약속이 없습니다."
                : selectedMeeting
                  ? selectedMeeting.title
                  : `${meetings.length}개의 활성 약속`}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label="닫기"
          className="shrink-0 rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]"
        >
          닫기
        </button>
      </div>

      {expanded && (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4">
          {loading && (
            <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-4 text-sm text-[var(--text-muted)]">
              약속을 불러오는 중…
            </div>
          )}

          {!loading && meetings.length === 0 && (
            <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-4">
              <div className="text-sm font-medium text-[var(--text-strong)]">
                아직 참여 중인 활성 약속이 없습니다.
              </div>
              <div className="mt-1 text-sm text-[var(--text-muted)]">
                메뉴에서 새 약속을 만들거나 초대 코드로 참여하세요.
              </div>
            </div>
          )}

          {meetings.map((meeting) => {
            const active = meeting.id === selectedMeetingId;
            const isOwner = !!myUserId && meeting.created_by === myUserId;
            const removeLabel = "나가기";
            return (
              <div
                key={meeting.id}
                className={`rounded-2xl px-4 py-3 transition ${
                  active ? "bg-[#eef5ff]" : "bg-[var(--surface-muted)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span
                      className={`rounded-full px-2 py-1 ${
                        meeting.status === "active"
                          ? "bg-white text-[var(--accent)]"
                          : "bg-white text-[var(--text-muted)]"
                      }`}
                    >
                      {meeting.status === "active" ? "진행 중" : "예정"}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-[var(--text-muted)]">
                      {meeting.visibility === "public" ? "공개" : "비공개"}
                    </span>
                    <span className="truncate">코드 {meeting.join_code}</span>
                  </div>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok =
                          typeof window === "undefined"
                            ? true
                            : window.confirm(
                                isOwner
                                  ? "이 약속을 삭제할까요? 모든 참여자의 링크가 사라집니다."
                                  : "이 약속에서 나갈까요?",
                              );
                        if (!ok) return;
                        await onRemove(meeting);
                      }}
                      className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-red-500 active:bg-red-50"
                    >
                      {removeLabel}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(meeting.id)}
                  className="mt-2 block w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-[var(--text-strong)]">
                        {meeting.title}
                      </div>
                      <div className="mt-1 line-clamp-1 text-sm text-[var(--text-muted)]">
                        {meeting.destination_label}
                      </div>
                    </div>
                    {active && (
                      <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white">
                        선택됨
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-muted)]">
                    {formatSchedule(meeting.scheduled_at)}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatSchedule(value: string | null) {
  if (!value) return "시간 미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
