"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "@/lib/geo/kakaoPlaces";
import type { PlaceSearchResult } from "@/types";

export interface PlaceSearchProps {
  onSelect: (place: PlaceSearchResult) => void;
  placeholder?: string;
}

export default function PlaceSearch({ onSelect, placeholder }: PlaceSearchProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!q.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    timerRef.current = window.setTimeout(async () => {
      try {
        const rs = await searchPlaces(q);
        setResults(rs);
      } catch (e: unknown) {
        setResults([]);
        setError(
          e instanceof Error ? e.message : "장소 검색 중 오류가 발생했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [q]);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder ?? "목적지 검색 (예: 강남역, 서울역…)"}
        className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-[var(--text-strong)] outline-none placeholder:text-slate-400 focus:border-[var(--accent)]"
      />
      {loading && (
        <div className="absolute right-3 top-3 text-xs text-[var(--text-muted)]">검색중…</div>
      )}
      {error && (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}
      {results.length > 0 && (
        <ul className="mt-2 max-h-72 overflow-auto rounded-xl border border-[var(--border-soft)] bg-white divide-y divide-[var(--border-soft)] shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => {
                  onSelect(r);
                  setQ(r.label);
                  setResults([]);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-strong)] hover:bg-[var(--surface-muted)]"
              >
                <div className="font-medium text-[var(--text-strong)]">{r.label}</div>
                {r.subLabel && (
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{r.subLabel}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
