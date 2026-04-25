export type TravelMode = "driving" | "walking" | "cycling" | "subway";
export type MeetingVisibility = "private" | "public";
export type MeetingStatus = "scheduled" | "active" | "closed";

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
  status: MeetingStatus;
  visibility: MeetingVisibility;
  join_code: string;
  share_token: string;
  created_at: string;
}

export interface MeetingSummary extends Meeting {
  joined_at?: string;
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
  provider?: "ors" | "osrm" | "estimated" | "subway-beta";
  isEstimated?: boolean;
  summaryLabel?: string;
  detailLabel?: string;
  legs?: Array<{
    type: "walking_to_station" | "subway" | "walking_to_destination";
    label: string;
    durationSeconds: number;
    distanceMeters: number;
  }>;
}

export interface PlaceSearchResult {
  id: string;
  label: string;
  subLabel?: string;
  lat: number;
  lng: number;
}
