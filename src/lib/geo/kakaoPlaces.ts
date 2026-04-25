import { loadKakaoMaps } from "@/lib/kakao/loadKakaoMaps";
import type { PlaceSearchResult } from "@/types";

export async function searchPlaces(
  query: string,
  opts: { limit?: number } = {},
): Promise<PlaceSearchResult[]> {
  const keyword = query.trim();
  if (!keyword) return [];

  const kakao = await loadKakaoMaps();
  const places = new kakao.maps.services.Places();

  return await new Promise((resolve) => {
    places.keywordSearch(
      keyword,
      (data, status) => {
        if (status !== kakao.maps.services.Status.OK || !data) {
          resolve([]);
          return;
        }

        resolve(
          data.slice(0, opts.limit ?? 8).map((place) => ({
            id: place.id,
            label: place.place_name,
            subLabel: place.road_address_name || place.address_name || undefined,
            lat: parseFloat(place.y),
            lng: parseFloat(place.x),
          })),
        );
      },
      { size: opts.limit ?? 8 },
    );
  });
}
