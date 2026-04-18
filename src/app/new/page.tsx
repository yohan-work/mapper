"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PlaceSearch from "@/components/Search/PlaceSearch";
import { ensureSession } from "@/lib/auth";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PlaceSearchResult } from "@/types";

export default function NewMeetingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("오늘 만남");
  const [place, setPlace] = useState<PlaceSearchResult | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = Boolean(place && title.trim());

  async function onCreate() {
    if (!place) return;
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
          title: title.trim(),
          destination_lat: place.lat,
          destination_lng: place.lng,
          destination_label: place.label,
          scheduled_at: scheduledAt || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      // 생성자도 참여자로 추가
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
      router.push(`/m/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto">
      <button
        onClick={() => router.push("/")}
        className="text-slate-400 text-sm mb-4"
      >
        ← 뒤로
      </button>
      <h1 className="text-2xl font-bold mb-6">새 약속 만들기</h1>

      <div className="space-y-5">
        <label className="block">
          <span className="text-sm text-slate-400">제목</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-brand outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-400">시간 (선택)</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-brand outline-none"
          />
        </label>

        <div>
          <span className="text-sm text-slate-400">목적지</span>
          <div className="mt-1">
            <PlaceSearch onSelect={setPlace} />
          </div>
          {place && (
            <p className="mt-2 text-xs text-slate-400 line-clamp-2">
              ✓ {place.label}
            </p>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-rose-900/30 border border-rose-700 text-sm text-rose-200">
            {error}
          </div>
        )}

        <button
          disabled={!canCreate || loading}
          onClick={onCreate}
          className="w-full py-3 rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-700 disabled:text-slate-400 transition font-semibold"
        >
          {loading ? "만드는 중…" : "약속 만들기"}
        </button>
      </div>
    </main>
  );
}
