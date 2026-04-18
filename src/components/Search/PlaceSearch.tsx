"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "@/lib/geo/nominatim";
import type { PlaceSearchResult } from "@/types";

export interface PlaceSearchProps {
  onSelect: (place: PlaceSearchResult) => void;
  placeholder?: string;
}

export default function PlaceSearch({ onSelect, placeholder }: PlaceSearchProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    timerRef.current = window.setTimeout(async () => {
      const rs = await searchPlaces(q);
      setResults(rs);
      setLoading(false);
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
        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-brand outline-none text-white placeholder:text-slate-500"
      />
      {loading && (
        <div className="absolute right-3 top-3 text-xs text-slate-400">검색중…</div>
      )}
      {results.length > 0 && (
        <ul className="mt-2 max-h-72 overflow-auto rounded-xl border border-slate-700 bg-slate-900 divide-y divide-slate-800">
          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => {
                  onSelect(r);
                  setQ(r.label);
                  setResults([]);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-800 text-sm"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
