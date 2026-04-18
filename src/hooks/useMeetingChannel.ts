"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { LocationPayload } from "@/types";

/**
 * 미팅별 Broadcast 채널을 구독한다.
 * - 내 위치를 broadcast(send)
 * - 다른 참여자 위치를 수신하여 Map<userId, payload> 로 반환
 */
export function useMeetingChannel(meetingId: string | null, meUserId: string | null) {
  const [peers, setPeers] = useState<Record<string, LocationPayload>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!meetingId) return;
    const sb = getSupabaseBrowser();
    const channel = sb.channel(`meeting:${meetingId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "loc" }, (msg) => {
      const payload = msg.payload as LocationPayload;
      if (!payload || !payload.userId) return;
      if (payload.userId === meUserId) return;
      setPeers((prev) => ({ ...prev, [payload.userId]: payload }));
    });

    channel.on("broadcast", { event: "leave" }, (msg) => {
      const userId = (msg.payload as { userId?: string })?.userId;
      if (!userId) return;
      setPeers((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [meetingId, meUserId]);

  const sendLocation = (payload: LocationPayload) => {
    const ch = channelRef.current;
    if (!ch) return;
    ch.send({ type: "broadcast", event: "loc", payload });
  };

  return { peers, sendLocation };
}
