"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ensureSession } from "@/lib/auth";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { useMyLocation } from "@/hooks/useMyLocation";
import { useMeetingChannel } from "@/hooks/useMeetingChannel";
import { haversine } from "@/lib/geo/geolocation";
import { fetchRoute } from "@/lib/geo/routeClient";
import type {
  LocationPayload,
  Meeting,
  Route,
  TravelMode,
} from "@/types";
import BottomSheet from "@/components/Meeting/BottomSheet";
import { locationsToRows } from "@/components/Meeting/EtaCard";

const MapView = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-slate-400">
      지도 로딩 중…
    </div>
  ),
});

const ARRIVAL_RADIUS_METERS = 100;

export default function MeetingRoom({ meetingId }: { meetingId: string }) {
  const [me, setMe] = useState<{
    userId: string;
    displayName: string;
    color: string;
  } | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>("driving");
  const [routes, setRoutes] = useState<Record<string, Route | null>>({});
  const [arrivedSet, setArrivedSet] = useState<Set<string>>(new Set());

  const { position, error: geoError } = useMyLocation();
  const { peers, sendLocation } = useMeetingChannel(
    meeting ? meetingId : null,
    me?.userId ?? null,
  );

  // 세션 + 미팅 로드 + 참여자 등록
  useEffect(() => {
    (async () => {
      try {
        if (!isSupabaseConfigured()) {
          setFatal(
            "Supabase 환경변수 미설정입니다. .env.local 을 채우고 서버를 재시작하세요.",
          );
          return;
        }
        const session = await ensureSession();
        setMe(session);
        const sb = getSupabaseBrowser();
        const { data: m, error } = await sb
          .from("meetings")
          .select("*")
          .eq("id", meetingId)
          .maybeSingle();
        if (error) throw error;
        if (!m) {
          setFatal("약속을 찾을 수 없습니다.");
          return;
        }
        setMeeting(m as Meeting);
        // 참여자 upsert
        await sb.from("participants").upsert(
          {
            meeting_id: meetingId,
            user_id: session.userId,
            display_name: session.displayName,
            color: session.color,
            travel_mode: travelMode,
          },
          { onConflict: "meeting_id,user_id" },
        );
      } catch (e: unknown) {
        setFatal(e instanceof Error ? e.message : "알 수 없는 오류");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  // travel_mode 변경 시 DB 업데이트
  useEffect(() => {
    if (!me || !meeting) return;
    const sb = getSupabaseBrowser();
    sb.from("participants")
      .update({ travel_mode: travelMode })
      .eq("meeting_id", meetingId)
      .eq("user_id", me.userId)
      .then(() => {});
  }, [travelMode, me, meeting, meetingId]);

  // 내 위치 payload
  const myPayload: LocationPayload | null = useMemo(() => {
    if (!me || !position) return null;
    return {
      userId: me.userId,
      displayName: me.displayName,
      color: me.color,
      lat: position.lat,
      lng: position.lng,
      heading: position.heading,
      speed: position.speed,
      accuracy: position.accuracy,
      travelMode,
      updatedAt: Date.now(),
    };
  }, [me, position, travelMode]);

  // 내 위치를 broadcast + DB upsert (throttled)
  const lastSentRef = useRef<{ t: number; lat: number; lng: number } | null>(
    null,
  );
  useEffect(() => {
    if (!myPayload) return;
    const last = lastSentRef.current;
    const now = Date.now();
    const moved = last
      ? haversine({ lat: last.lat, lng: last.lng }, myPayload)
      : Infinity;
    if (last && now - last.t < 3000 && moved < 10) return;
    lastSentRef.current = { t: now, lat: myPayload.lat, lng: myPayload.lng };
    sendLocation(myPayload);

    // DB 스냅샷(최신만) - 15초마다
    if (!last || now - last.t > 15000) {
      (async () => {
        const sb = getSupabaseBrowser();
        const { data: p } = await sb
          .from("participants")
          .select("id")
          .eq("meeting_id", meetingId)
          .eq("user_id", myPayload.userId)
          .maybeSingle();
        if (p) {
          await sb.from("locations").upsert(
            {
              participant_id: p.id,
              lat: myPayload.lat,
              lng: myPayload.lng,
              heading: myPayload.heading,
              speed: myPayload.speed,
              accuracy: myPayload.accuracy,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "participant_id" },
          );
        }
      })();
    }
  }, [myPayload, meetingId, sendLocation]);

  const peerList = useMemo(() => Object.values(peers), [peers]);

  // 경로 + ETA 계산 (me + peers 각각)
  useEffect(() => {
    if (!meeting) return;
    const dest = { lng: meeting.destination_lng, lat: meeting.destination_lat };
    const targets: { userId: string; from: LocationPayload; mode: TravelMode }[] =
      [];
    if (myPayload) {
      targets.push({ userId: myPayload.userId, from: myPayload, mode: travelMode });
    }
    for (const p of peerList) {
      targets.push({ userId: p.userId, from: p, mode: p.travelMode });
    }
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        targets.map(async (t) => {
          const r = await fetchRoute(t.from, dest, t.mode);
          return [t.userId, r] as const;
        }),
      );
      if (cancelled) return;
      setRoutes(Object.fromEntries(results));
    })();
    return () => {
      cancelled = true;
    };
    // 좌표 소수 4자리 수준으로 반올림하여 과다 호출 방지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    meeting?.id,
    travelMode,
    Math.round((myPayload?.lat ?? 0) * 3000),
    Math.round((myPayload?.lng ?? 0) * 3000),
    peerList
      .map(
        (p) =>
          `${p.userId}:${Math.round(p.lat * 3000)}:${Math.round(p.lng * 3000)}:${p.travelMode}`,
      )
      .join("|"),
  ]);

  // 도착 감지 + 알림
  useEffect(() => {
    if (!meeting) return;
    const dest = { lat: meeting.destination_lat, lng: meeting.destination_lng };
    const allHere: LocationPayload[] = [];
    if (myPayload) allHere.push(myPayload);
    for (const p of peerList) allHere.push(p);
    setArrivedSet((prev) => {
      const next = new Set(prev);
      for (const who of allHere) {
        const d = haversine(dest, who);
        if (d <= ARRIVAL_RADIUS_METERS && !next.has(who.userId)) {
          next.add(who.userId);
          notifyArrival(who.displayName, who.userId === me?.userId);
        }
      }
      return next;
    });
  }, [peerList, myPayload, meeting, me?.userId]);

  function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: meeting?.title ?? "약속", url }).catch(() => {});
      return;
    }
    if (navigator.clipboard) {
      const text = [
        `${meeting?.title ?? "약속"} 참여`,
        meeting?.join_code ? `참여 코드: ${meeting.join_code}` : null,
        url,
      ]
        .filter(Boolean)
        .join("\n");
      navigator.clipboard.writeText(text).then(() => {
        alert("링크와 참여 코드를 복사했습니다.");
      });
    }
  }

  if (fatal) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-sm text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <p className="text-slate-300 whitespace-pre-line">{fatal}</p>
          <a href="/" className="inline-block text-brand underline">
            홈으로
          </a>
        </div>
      </main>
    );
  }

  if (!meeting || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-400">
        약속을 불러오는 중…
      </main>
    );
  }

  const rows = locationsToRows(
    myPayload,
    peerList,
    routes,
    arrivedSet,
    me.userId,
  );

  return (
    <main className="fixed inset-0 h-[100dvh]">
      <MapView
        center={myPayload ?? undefined}
        destination={{
          lat: meeting.destination_lat,
          lng: meeting.destination_lng,
          label: meeting.destination_label,
        }}
        me={myPayload}
        peers={peerList}
        routes={routes}
        selectedMode={travelMode}
      />
      {geoError && (
        <div className="absolute left-3 right-3 top-3 z-20 mx-auto max-w-md rounded-2xl bg-white px-4 py-3 text-sm text-amber-700 shadow-[var(--shadow-card)]">
          위치 권한이 필요합니다: {geoError}
        </div>
      )}
      <BottomSheet
        title={meeting.title}
        destinationLabel={meeting.destination_label}
        visibility={meeting.visibility}
        joinCode={meeting.join_code}
        myMode={travelMode}
        onChangeMode={setTravelMode}
        rows={rows}
        onShare={onShare}
      />
    </main>
  );
}

function notifyArrival(name: string, isMe: boolean) {
  const msg = isMe ? "목적지에 도착했어요!" : `${name} 님이 도착했습니다`;
  if (typeof window === "undefined") return;
  try {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("🎉 도착", { body: msg });
        return;
      }
      if (Notification.permission === "default") {
        Notification.requestPermission().then((p) => {
          if (p === "granted") new Notification("🎉 도착", { body: msg });
        });
        return;
      }
    }
  } catch {
    // ignore
  }
  // fallback: console
  console.log("[arrival]", msg);
}
