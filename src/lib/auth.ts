"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { pickColor, randomName } from "@/lib/color";

/**
 * 현재 세션을 보장한다. 세션이 없으면 익명 로그인을 수행하고
 * profiles 테이블에 기본 프로필을 만든다.
 */
export async function ensureSession(): Promise<{
  userId: string;
  displayName: string;
  color: string;
}> {
  const sb = getSupabaseBrowser();
  let {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) {
      const msg = error.message || "";
      if (/anonymous/i.test(msg) && /disabled/i.test(msg)) {
        throw new Error(
          "Supabase에서 '익명 로그인(Anonymous Sign-ins)'이 꺼져 있습니다.\n" +
            "대시보드 → Authentication → Providers → Anonymous Sign-Ins 를 켠 뒤 다시 시도하세요.",
        );
      }
      throw error;
    }
    user = data.user;
  }
  if (!user) throw new Error("세션 생성 실패");

  const { data: profile } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const displayName = randomName();
    const color = pickColor(user.id);
    await sb.from("profiles").insert({
      id: user.id,
      display_name: displayName,
      color,
    });
    return { userId: user.id, displayName, color };
  }

  return {
    userId: user.id,
    displayName: profile.display_name,
    color: profile.color,
  };
}

export async function updateDisplayName(name: string) {
  const sb = getSupabaseBrowser();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return;
  await sb
    .from("profiles")
    .update({ display_name: name })
    .eq("id", u.user.id);
}
