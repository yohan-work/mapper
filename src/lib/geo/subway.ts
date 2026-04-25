import { fetchOrsRoute } from "@/lib/geo/ors";
import { fetchOsrmRoute } from "@/lib/geo/osrm";
import type { LngLat, Route } from "@/types";

interface SubwayStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

const KAKAO_LOCAL_BASE = "https://dapi.kakao.com/v2/local/search/category.json";
const SUBWAY_RADIUS_METERS = 2000;
const DEFAULT_WAIT_SECONDS = 4 * 60;
const SUBWAY_SPEED_MPS = 32 / 3.6;

export async function fetchSubwayRoute(from: LngLat, to: LngLat): Promise<Route | null> {
  const [fromStations, toStations] = await Promise.all([
    fetchNearbySubwayStations(from),
    fetchNearbySubwayStations(to),
  ]);
  if (!fromStations.length || !toStations.length) return null;

  const originStation = fromStations[0];
  const destinationStation = findBestDestinationStation(originStation, toStations);
  if (!destinationStation) return null;

  const [walkToStation, walkFromStation, subwayLeg] = await Promise.all([
    getWalkingRoute(from, { lat: originStation.lat, lng: originStation.lng }),
    getWalkingRoute({ lat: destinationStation.lat, lng: destinationStation.lng }, to),
    getSubwaySegment(originStation, destinationStation),
  ]);

  const walkToStationDuration = walkToStation?.durationSeconds ?? estimateWalkingSeconds(originStation.distanceMeters);
  const walkToStationDistance = walkToStation?.distanceMeters ?? originStation.distanceMeters;
  const walkFromStationDuration = walkFromStation?.durationSeconds ?? estimateWalkingSeconds(destinationStation.distanceMeters);
  const walkFromStationDistance = walkFromStation?.distanceMeters ?? destinationStation.distanceMeters;

  return {
    coordinates: mergeCoordinates(
      walkToStation?.coordinates ?? [
        [from.lng, from.lat],
        [originStation.lng, originStation.lat],
      ],
      [
        [originStation.lng, originStation.lat],
        [destinationStation.lng, destinationStation.lat],
      ],
      walkFromStation?.coordinates ?? [
        [destinationStation.lng, destinationStation.lat],
        [to.lng, to.lat],
      ],
    ),
    distanceMeters:
      walkToStationDistance + subwayLeg.distanceMeters + walkFromStationDistance,
    durationSeconds:
      walkToStationDuration + subwayLeg.durationSeconds + walkFromStationDuration,
    provider: "subway-beta",
    isEstimated: subwayLeg.isEstimated,
    summaryLabel: `${originStation.name} 탑승 → ${destinationStation.name} 하차`,
    detailLabel: subwayLeg.isEstimated
      ? "수도권 지하철 추천 경로 베타 · 추정 시간"
      : "수도권 지하철 추천 경로 베타",
    legs: [
      {
        type: "walking_to_station",
        label: `${originStation.name}까지 도보`,
        durationSeconds: walkToStationDuration,
        distanceMeters: walkToStationDistance,
      },
      {
        type: "subway",
        label: `${originStation.name} → ${destinationStation.name}`,
        durationSeconds: subwayLeg.durationSeconds,
        distanceMeters: subwayLeg.distanceMeters,
      },
      {
        type: "walking_to_destination",
        label: `${destinationStation.name}에서 목적지까지 도보`,
        durationSeconds: walkFromStationDuration,
        distanceMeters: walkFromStationDistance,
      },
    ],
  };
}

async function fetchNearbySubwayStations(center: LngLat): Promise<SubwayStation[]> {
  const restKey = process.env.KAKAO_REST_API_KEY;
  if (!restKey) return [];

  const url = new URL(KAKAO_LOCAL_BASE);
  url.searchParams.set("category_group_code", "SW8");
  url.searchParams.set("x", String(center.lng));
  url.searchParams.set("y", String(center.lat));
  url.searchParams.set("radius", String(SUBWAY_RADIUS_METERS));
  url.searchParams.set("sort", "distance");
  url.searchParams.set("size", "8");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `KakaoAK ${restKey}`,
    },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    documents?: Array<{
      id: string;
      place_name: string;
      distance: string;
      x: string;
      y: string;
    }>;
  };

  return (data.documents ?? [])
    .map((station) => ({
      id: station.id,
      name: station.place_name,
      lng: Number(station.x),
      lat: Number(station.y),
      distanceMeters: Number(station.distance),
    }))
    .filter((station) => Number.isFinite(station.lng) && Number.isFinite(station.lat));
}

function findBestDestinationStation(
  originStation: SubwayStation,
  candidates: SubwayStation[],
) {
  return (
    [...candidates].sort((a, b) => {
      const aScore = directMeters(originStation, a) + a.distanceMeters * 1.3;
      const bScore = directMeters(originStation, b) + b.distanceMeters * 1.3;
      return aScore - bScore;
    })[0] ?? null
  );
}

async function getWalkingRoute(from: LngLat, to: LngLat) {
  return (await fetchOrsRoute(from, to, "walking")) ?? (await fetchOsrmRoute(from, to, "walking"));
}

async function getSubwaySegment(originStation: SubwayStation, destinationStation: SubwayStation) {
  const official = await fetchOfficialSubwayPath(originStation.name, destinationStation.name);
  if (official) {
    return {
      ...official,
      isEstimated: false,
    };
  }

  const distanceMeters = Math.max(
    1200,
    Math.round(directMeters(originStation, destinationStation) * 1.12),
  );
  return {
    distanceMeters,
    durationSeconds: Math.round(distanceMeters / SUBWAY_SPEED_MPS) + DEFAULT_WAIT_SECONDS,
    isEstimated: true,
  };
}

async function fetchOfficialSubwayPath(fromStation: string, toStation: string) {
  const serviceKey = process.env.SEOUL_SUBWAY_API_KEY;
  if (!serviceKey) return null;

  const url = new URL("https://apis.data.go.kr/B553766/path/getShtrmPath");
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("dptreStnNm", normalizeStationName(fromStation));
  url.searchParams.set("arvlStnNm", normalizeStationName(toStation));
  url.searchParams.set("searchDt", formatSearchDate(new Date()));
  url.searchParams.set("searchType", "duration");

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as SubwayPathResponse;
    if (data.header?.resultCode !== "00" || !data.body) return null;

    const durationSeconds = toDurationSeconds(data.body.totalreqHr);
    const distanceMeters = toDistanceMeters(data.body.totalDstc);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;

    const transferCount = Number(data.body.trsitNmtm ?? 0);
    const transferSummary = (data.body.trfstnNms ?? [])
      .map((station) =>
        station.stnNm
          ? `${station.stnNm}${station.dptreLineNm && station.arvlLineNm ? `(${station.dptreLineNm}→${station.arvlLineNm})` : ""}`
          : null,
      )
      .filter(Boolean)
      .join(", ");

    const subwaySegments = buildSubwayLegs(data.body.paths ?? []);

    return {
      coordinates: [],
      durationSeconds,
      distanceMeters,
      summaryLabel:
        transferCount > 0
          ? `${transferCount}회 환승 · ${transferSummary || "환승역 정보"}`
          : "환승 없이 이동",
      detailLabel: buildTrainWindowLabel(data.body.paths ?? []),
      legs: subwaySegments,
    };
  } catch {
    return null;
  }
}

function normalizeStationName(name: string) {
  return name.replace(/\s+역$/, "").replace(/역$/, "").trim();
}

function formatSearchDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function findNumericField(input: unknown, candidates: string[]): number {
  if (!input || typeof input !== "object") return NaN;

  const queue: unknown[] = [input];
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    const record = current as Record<string, unknown>;
    for (const key of candidates) {
      const value = record[key];
      const numeric = toNumber(value);
      if (Number.isFinite(numeric)) return numeric;
    }
    queue.push(...Object.values(record));
  }

  return NaN;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : NaN;
  }
  return NaN;
}

function toDurationSeconds(value: unknown) {
  const numeric = toNumber(value);
  return Number.isFinite(numeric)
    ? numeric > 1000
      ? Math.round(numeric)
      : Math.round(numeric * 60)
    : NaN;
}

function toDistanceMeters(value: unknown) {
  const numeric = toNumber(value);
  return Number.isFinite(numeric)
    ? numeric > 1000
      ? Math.round(numeric)
      : Math.round(numeric * 1000)
    : 0;
}

function buildSubwayLegs(paths: SubwayPathItem[]) {
  const legs: NonNullable<Route["legs"]> = [];
  let currentLine = "";
  let currentStart = "";
  let currentEnd = "";
  let currentDuration = 0;
  let currentDistance = 0;

  for (const path of paths ?? []) {
    const isTransfer = path.trsitYn === "Y";
    const durationSeconds = toDurationSeconds(path.reqHr) + toDurationSeconds(path.wtngHr);
    const distanceMeters = toDistanceMeters(path.stnSctnDstc);

    if (isTransfer) {
      pushCurrent();
      legs.push({
        type: "subway",
        label: `${path.dptreStn?.stnNm ?? ""}에서 ${path.arvlStn?.lineNm ?? ""} 환승`,
        durationSeconds,
        distanceMeters,
      });
      continue;
    }

    const lineName = path.dptreStn?.lineNm ?? path.arvlStn?.lineNm ?? "";
    const startName = path.dptreStn?.stnNm ?? "";
    const endName = path.arvlStn?.stnNm ?? "";

    if (!currentLine) {
      currentLine = lineName;
      currentStart = startName;
      currentEnd = endName;
      currentDuration = durationSeconds;
      currentDistance = distanceMeters;
      continue;
    }

    if (currentLine === lineName) {
      currentEnd = endName;
      currentDuration += durationSeconds;
      currentDistance += distanceMeters;
      continue;
    }

    pushCurrent();
    currentLine = lineName;
    currentStart = startName;
    currentEnd = endName;
    currentDuration = durationSeconds;
    currentDistance = distanceMeters;
  }

  pushCurrent();
  return legs;

  function pushCurrent() {
    if (!currentLine || !currentStart || !currentEnd) return;
    legs.push({
      type: "subway",
      label: `${currentLine} ${currentStart} → ${currentEnd}`,
      durationSeconds: currentDuration,
      distanceMeters: currentDistance,
    });
    currentLine = "";
    currentStart = "";
    currentEnd = "";
    currentDuration = 0;
    currentDistance = 0;
  }
}

function buildTrainWindowLabel(paths: SubwayPathItem[]) {
  const departures = paths
    .map((path) => path.trainDptreTm)
    .filter((value): value is string => Boolean(value));
  const arrivals = paths
    .map((path) => path.trainArvlTm)
    .filter((value): value is string => Boolean(value));

  if (!departures.length || !arrivals.length) {
    return "수도권 지하철 추천 경로 베타";
  }

  return `${departures[0]} 출발 · ${arrivals[arrivals.length - 1]} 도착 예정`;
}

interface SubwayPathResponse {
  header?: {
    resultCode?: string;
    resultMsg?: string;
  };
  body?: {
    totalDstc?: number | string;
    totalreqHr?: number | string;
    trsitNmtm?: number | string;
    trfstnNms?: Array<{
      stnNm?: string;
      dptreLineNm?: string;
      arvlLineNm?: string;
    }>;
    paths?: SubwayPathItem[];
  };
}

interface SubwayPathItem {
  dptreStn?: {
    stnNm?: string;
    lineNm?: string;
  };
  arvlStn?: {
    stnNm?: string;
    lineNm?: string;
  };
  stnSctnDstc?: number | string;
  reqHr?: number | string;
  wtngHr?: number | string;
  trsitYn?: string;
  trainDptreTm?: string | null;
  trainArvlTm?: string | null;
}

function estimateWalkingSeconds(distanceMeters: number) {
  return Math.max(60, Math.round(distanceMeters / (4 / 3.6)));
}

function directMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function mergeCoordinates(...segments: [number, number][][]) {
  const merged: [number, number][][] = [];
  for (const segment of segments) {
    if (!segment.length) continue;
    const lastSegment = merged.at(-1);
    if (!lastSegment) {
      merged.push([...segment]);
      continue;
    }
    const lastPoint = lastSegment[lastSegment.length - 1];
    const [firstPoint, ...rest] = segment;
    if (lastPoint[0] === firstPoint[0] && lastPoint[1] === firstPoint[1]) {
      lastSegment.push(...rest);
    } else {
      lastSegment.push(...segment);
    }
  }
  return merged.flat();
}
