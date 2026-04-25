import { NextRequest, NextResponse } from "next/server";
import { getBestRoute } from "@/lib/geo/serverRoute";
import type { TravelMode } from "@/types";

const MODES = new Set<TravelMode>(["driving", "walking", "cycling", "subway"]);

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const fromLng = Number(search.get("fromLng"));
  const fromLat = Number(search.get("fromLat"));
  const toLng = Number(search.get("toLng"));
  const toLat = Number(search.get("toLat"));
  const mode = search.get("mode") as TravelMode | null;

  if (
    !Number.isFinite(fromLng) ||
    !Number.isFinite(fromLat) ||
    !Number.isFinite(toLng) ||
    !Number.isFinite(toLat) ||
    !mode ||
    !MODES.has(mode)
  ) {
    return NextResponse.json(
      { error: "invalid_route_query" },
      { status: 400 },
    );
  }

  const route = await getBestRoute(
    { lng: fromLng, lat: fromLat },
    { lng: toLng, lat: toLat },
    mode,
  );

  return NextResponse.json(
    { route },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
