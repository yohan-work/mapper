export type TravelMode = "driving" | "walking" | "cycling";

export interface LngLat {
  lng: number;
  lat: number;
}

export interface Meeting {
  id: string;
  created_by: string;
  title: string;
  destination_lat: number;
  destination_lng: number;
  destination_label: string;
  scheduled_at: string | null;
  status: "active" | "closed";
  share_token: string;
  created_at: string;
}

export interface Participant {
  id: string;
  meeting_id: string;
  user_id: string;
  display_name: string;
  color: string;
  travel_mode: TravelMode;
  joined_at: string;
  arrived_at: string | null;
}

export interface LocationPayload {
  userId: string;
  displayName: string;
  color: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  travelMode: TravelMode;
  updatedAt: number;
}

export interface Route {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

export interface PlaceSearchResult {
  id: string;
  label: string;
  lat: number;
  lng: number;
}
