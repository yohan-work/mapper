"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PlacePickerMap from "@/components/Map/PlacePickerMap";
import PlaceSearch from "@/components/Search/PlaceSearch";
import { ensureSession } from "@/lib/auth";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { MeetingVisibility, PlaceSearchResult } from "@/types";

export interface NewMeetingFormProps {
  submitLabel?: string;
  className?: string;
  compact?: boolean;
  onCreated?: (meetingId: string) => void;
}

export default function NewMeetingForm({
  submitLabel = "약속 만들기",
  className,
  compact = false,
  onCreated,
}: NewMeetingFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("오늘 만남");
  const [place, setPlace] = useState<PlaceSearchResult | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [visibility, setVisibility] = useState<MeetingVisibility>("private");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = Boolean(place && (compact || title.trim()));

  async function handleCreate() {
    if (!place || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured()) {
        throw new Error(
          "Supabase 환경변수가 없습니다. .env.local 을 설정하고 서버를 재시작하세요.",
        );
      }
      const me = await ensureSession();
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("meetings")
        .insert({
          created_by: me.userId,
          title: compact ? buildQuickTitle(place.label) : title.trim(),
          destination_lat: place.lat,
          destination_lng: place.lng,
          destination_label: place.label,
          scheduled_at: scheduledAt || null,
          visibility,
          status: scheduledAt ? "scheduled" : "active",
        })
        .select("id, join_code")
        .single();
      if (error) throw error;

      await sb.from("participants").upsert(
        {
          meeting_id: data.id,
          user_id: me.userId,
          display_name: me.displayName,
          color: me.color,
          travel_mode: "driving",
        },
        { onConflict: "meeting_id,user_id" },
      );

      onCreated?.(data.id);
      router.push(`/m/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {!compact && (
          <>
            <label className="block">
              <span className="text-sm text-[var(--text-muted)]">제목</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-[var(--text-strong)] outline-none placeholder:text-slate-400 focus:border-[var(--accent)]"
              />
            </label>

            <label className="block">
              <span className="text-sm text-[var(--text-muted)]">시간 (선택)</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-[var(--text-strong)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </>
        )}

        {compact && (
          <label className="block">
            <span className="text-sm text-[var(--text-muted)]">시간 (선택)</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-[var(--text-strong)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        )}

        <div>
          <span className="text-sm text-[var(--text-muted)]">
            {compact ? "목적지만 고르면 바로 생성됩니다." : "목적지"}
          </span>
          <div className="mt-1">
            <PlaceSearch onSelect={setPlace} />
          </div>
          {place && (
            <p className="mt-2 line-clamp-2 text-xs text-[var(--text-muted)]">
              ✓ {place.label}
              {place.subLabel ? ` · ${place.subLabel}` : ""}
            </p>
          )}
        </div>

        {!compact && <PlacePickerMap value={place} onSelect={setPlace} />}

        <div>
          <div className="text-sm text-[var(--text-muted)]">공개 범위</div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                visibility === "private"
                  ? "border-[var(--accent)] bg-[#eef5ff] text-[var(--text-strong)]"
                  : "border-[var(--border-soft)] bg-white text-[var(--text-strong)]"
              }`}
            >
              <div className="text-sm font-medium">비공개</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                링크나 코드가 있는 사람만 참여
              </div>
            </button>
            <button
              type="button"
              onClick={() => setVisibility("public")}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                visibility === "public"
                  ? "border-[var(--accent)] bg-[#eef5ff] text-[var(--text-strong)]"
                  : "border-[var(--border-soft)] bg-white text-[var(--text-strong)]"
              }`}
            >
              <div className="text-sm font-medium">공개</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                이후 탐색 탭에서 노출 가능
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          disabled={!canCreate || loading}
          onClick={handleCreate}
          className="w-full rounded-xl bg-[var(--text-strong)] py-3 font-semibold text-white transition hover:bg-black disabled:bg-slate-300 disabled:text-white"
        >
          {loading ? "만드는 중…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

function buildQuickTitle(label: string) {
  const short = label.split(",")[0]?.trim();
  return short ? `${short}에서 만나요` : "빠른 약속";
}
