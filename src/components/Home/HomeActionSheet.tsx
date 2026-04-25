"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NewMeetingForm from "@/components/Meeting/NewMeetingForm";

type HomePanel = "create" | "join";

export interface HomeActionSheetProps {
  expanded?: boolean;
  initialPanel?: HomePanel;
  onToggle: () => void;
}

export default function HomeActionSheet({
  expanded = false,
  initialPanel = "create",
  onToggle,
}: HomeActionSheetProps) {
  const router = useRouter();
  const [panel, setPanel] = useState<HomePanel>(initialPanel);
  const [joinValue, setJoinValue] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (expanded) {
      setPanel(initialPanel);
    }
  }, [expanded, initialPanel]);

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
      <div className="overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-float)]">
        <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[var(--text-strong)]">
                새 약속 또는 참여
              </h1>
              <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
                {panel === "create" ? "빠른 생성" : "코드 참여"}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              지도 위에서 바로 만들고, 링크나 코드로 곧바로 합류할 수 있습니다.
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
          <>
            <div className="grid grid-cols-1 gap-2 px-3 sm:grid-cols-2">
              <button
                onClick={() => setPanel("create")}
                className={`rounded-2xl px-4 py-3 text-left transition ${
                  panel === "create"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--text-strong)]"
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
                    : "bg-[var(--surface-muted)] text-[var(--text-strong)]"
                }`}
              >
                <div className="text-sm font-semibold">공유 링크로 참여</div>
                <div className="mt-1 text-xs opacity-80">
                  링크, 미팅 ID, 짧은 참여 코드로 바로 입장합니다.
                </div>
              </button>
            </div>

            <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
              {panel === "create" ? (
                <div className="space-y-3">
                  <NewMeetingForm compact submitLabel="빠르게 약속 만들기" />
                  <Link
                    href="/new"
                    className="block rounded-xl bg-[var(--surface-muted)] py-2.5 text-center text-xs font-semibold text-[var(--text-muted)]"
                  >
                    전체 폼으로 열기
                  </Link>
                </div>
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
                      className="mt-1 w-full rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-[var(--text-strong)] outline-none placeholder:text-[var(--text-soft)] focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </label>
                  {joinError && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                      {joinError}
                    </div>
                  )}
                  <button
                    onClick={onJoin}
                    disabled={joining}
                    className="w-full rounded-xl bg-[var(--accent)] py-3 font-semibold text-white transition active:bg-[var(--accent-strong)] disabled:bg-[var(--border-strong)]"
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
