"use client";

import type { MeetingSummary } from "@/types";

export interface MyMeetingsPanelProps {
  meetings: MeetingSummary[];
  selectedMeetingId: string | null;
  loading?: boolean;
  expanded?: boolean;
  onSelect: (meetingId: string) => void;
  onToggle: () => void;
}

export default function MyMeetingsPanel({
  meetings,
  selectedMeetingId,
  loading,
  expanded = false,
  onSelect,
  onToggle,
}: MyMeetingsPanelProps) {
  const selectedMeeting =
    meetings.find((meeting) => meeting.id === selectedMeetingId) ?? meetings[0] ?? null;

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            My Meetings
          </div>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
            내가 속한 활성 약속
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {loading
              ? "약속을 불러오는 중입니다."
              : meetings.length === 0
                ? "활성 약속이 아직 없습니다."
                : selectedMeeting
                  ? `${meetings.length}개 중 ${selectedMeeting.title}`
                  : `${meetings.length}개의 활성 약속`}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
          {expanded ? "접기" : "열기"}
        </span>
      </button>

      {expanded && (
        <div className="max-h-[28vh] overflow-auto border-t border-[var(--border-soft)] px-3 py-3 space-y-2 bg-[var(--surface)]">
          {loading && (
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4 text-sm text-[var(--text-muted)]">
              약속을 불러오는 중…
            </div>
          )}

          {!loading && meetings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
              <div className="text-sm font-medium text-[var(--text-strong)]">
                아직 참여 중인 활성 약속이 없습니다.
              </div>
              <div className="mt-1 text-sm text-[var(--text-muted)]">
                아래에서 빠르게 새 약속을 만들거나, 초대 코드로 참여하세요.
              </div>
            </div>
          )}

          {meetings.map((meeting) => {
            const active = meeting.id === selectedMeetingId;
            return (
              <button
                key={meeting.id}
                onClick={() => onSelect(meeting.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-[var(--accent)] bg-[#eef5ff]"
                    : "border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span
                    className={`rounded-full px-2 py-1 ${
                      meeting.status === "active"
                        ? "bg-[#eef5ff] text-[var(--accent)]"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {meeting.status === "active" ? "진행 중" : "예정"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 ${
                      meeting.visibility === "public"
                        ? "bg-[#eef5ff] text-[var(--accent)]"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {meeting.visibility === "public" ? "공개" : "비공개"}
                  </span>
                  <span>코드 {meeting.join_code}</span>
                </div>
                <div className="mt-2 text-base font-semibold text-[var(--text-strong)]">
                  {meeting.title}
                </div>
                <div className="mt-1 text-sm text-[var(--text-muted)] line-clamp-1">
                  {meeting.destination_label}
                </div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  {formatSchedule(meeting.scheduled_at)}
                </div>
              </button>
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
