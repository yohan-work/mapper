"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import NewMeetingForm from "@/components/Meeting/NewMeetingForm";

type HomePanel = "create" | "join";

export interface HomeActionSheetProps {
  expanded?: boolean;
  onToggle: () => void;
}

export default function HomeActionSheet({
  expanded = false,
  onToggle,
}: HomeActionSheetProps) {
  const router = useRouter();
  const [panel, setPanel] = useState<HomePanel>("create");
  const [joinValue, setJoinValue] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function onJoin() {
    const input = joinValue.trim();
    if (!input || joining) {
      if (!input) setJoinError("공유 링크, 미팅 ID 또는 참여 코드를 입력하세요.");
      return;
    }

    const directMeetingId = parseMeetingId(input);
    if (directMeetingId) {
      setJoinError(null);
      router.push(`/m/${directMeetingId}`);
      return;
    }

    setJoining(true);
    setJoinError(null);
    try {
      const { getSupabaseBrowser, isSupabaseConfigured } = await import(
        "@/lib/supabase/client"
      );
      if (!isSupabaseConfigured()) {
        throw new Error(
          "Supabase 환경변수가 없습니다. .env.local 을 설정하고 서버를 재시작하세요.",
        );
      }

      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("meetings")
        .select("id")
        .eq("join_code", input.toUpperCase())
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error("일치하는 약속을 찾을 수 없습니다.");
      }
      router.push(`/m/${data.id}`);
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : "참여 중 오류가 발생했습니다.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="pointer-events-auto">
      <div className="overflow-hidden rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onToggle}
            className="min-w-0 flex-1 text-left"
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Mapper
              </div>
              <h1 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
                새 약속 만들기 또는 참여하기
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {expanded
                  ? "목적지만 고르면 바로 만들고, 링크나 코드로도 바로 참여할 수 있습니다."
                  : panel === "create"
                    ? "빠른 생성 폼이 준비되어 있습니다."
                    : "링크 또는 참여 코드로 입장할 수 있습니다."}
              </p>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/new"
              className="rounded-full border border-[var(--border-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            >
              전체 폼
            </Link>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]"
            >
              {expanded ? "접기" : "열기"}
            </button>
          </div>
        </div>

        {expanded && (
          <>
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--border-soft)] p-3">
            <button
              onClick={() => setPanel("create")}
              className={`rounded-2xl px-4 py-3 text-left transition ${
                panel === "create"
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-strong)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              <div className="text-sm font-semibold">새 약속 만들기</div>
              <div className="mt-1 text-xs opacity-80">
                목적지만 고르면 바로 방을 만들 수 있습니다.
              </div>
            </button>
            <button
              onClick={() => setPanel("join")}
              className={`rounded-2xl px-4 py-3 text-left transition ${
                panel === "join"
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-strong)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              <div className="text-sm font-semibold">공유 링크로 참여</div>
              <div className="mt-1 text-xs opacity-80">
                링크, 미팅 ID, 짧은 참여 코드로 바로 입장합니다.
              </div>
            </button>
            </div>

            <div className="px-4 pb-4">
              {panel === "create" ? (
                <NewMeetingForm compact submitLabel="빠르게 약속 만들기" />
              ) : (
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm text-[var(--text-muted)]">공유 링크, 미팅 ID 또는 참여 코드</span>
                    <input
                      value={joinValue}
                      onChange={(e) => {
                        setJoinValue(e.target.value);
                        if (joinError) setJoinError(null);
                      }}
                      placeholder="https://.../m/123, 123, ABC123"
                      className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-[var(--text-strong)] outline-none placeholder:text-slate-400 focus:border-[var(--accent)]"
                    />
                  </label>
                  {joinError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {joinError}
                    </div>
                  )}
                  <button
                    onClick={onJoin}
                    disabled={joining}
                    className="w-full rounded-xl bg-[var(--text-strong)] py-3 font-semibold text-white transition hover:bg-black disabled:bg-slate-300"
                  >
                    {joining ? "확인 중…" : "참여하기"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function parseMeetingId(value: string) {
  const input = value.trim();
  if (!input) return null;
  const pathMatch = input.match(/\/m\/([0-9a-f-]{8,})/i);
  if (pathMatch) return pathMatch[1];
  const idMatch = input.match(/^([0-9a-f-]{8,})$/i);
  if (idMatch) return idMatch[1];
  return null;
}
