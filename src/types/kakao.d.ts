declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor(sw?: LatLng, ne?: LatLng);
    extend(latlng: LatLng): void;
  }

  interface MapOptions {
    center: LatLng;
    level?: number;
    draggable?: boolean;
    disableDoubleClick?: boolean;
    disableDoubleClickZoom?: boolean;
    keyboardShortcuts?: boolean;
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    setLevel(level: number): void;
    getLevel(): number;
    panTo(latlng: LatLng): void;
    setBounds(
      bounds: LatLngBounds,
      paddingTop?: number,
      paddingRight?: number,
      paddingBottom?: number,
      paddingLeft?: number,
    ): void;
    addOverlayMapTypeId(mapTypeId: MapTypeId): void;
    removeOverlayMapTypeId(mapTypeId: MapTypeId): void;
    relayout(): void;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map | null;
    title?: string;
    clickable?: boolean;
    image?: MarkerImage;
    zIndex?: number;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    setPosition(latlng: LatLng): void;
    setTitle(title: string): void;
    getPosition(): LatLng;
  }

  class MarkerImage {
    constructor(src: string, size: Size, options?: { offset?: Point });
  }

  class Point {
    constructor(x: number, y: number);
  }

  class Size {
    constructor(width: number, height: number);
  }

  interface CustomOverlayOptions {
    map?: Map | null;
    position: LatLng;
    content: string | HTMLElement;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
    clickable?: boolean;
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions);
    setMap(map: Map | null): void;
    setPosition(latlng: LatLng): void;
    setContent(content: string | HTMLElement): void;
  }

  interface PolylineOptions {
    map?: Map | null;
    path: LatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
    zIndex?: number;
  }

  class Polyline {
    constructor(options: PolylineOptions);
    setMap(map: Map | null): void;
    setPath(path: LatLng[]): void;
    setOptions(options: PolylineOptions): void;
  }

  enum MapTypeId {
    TRAFFIC,
    BICYCLE,
  }

  namespace event {
    function addListener(
      target: object,
      type: string,
      handler: (...args: any[]) => void,
    ): void;
    function removeListener(
      target: object,
      type: string,
      handler: (...args: any[]) => void,
    ): void;
  }

  function load(callback: () => void): void;

  namespace services {
    enum Status {
      OK,
      ZERO_RESULT,
      ERROR,
    }

    enum SortBy {
      ACCURACY,
      DISTANCE,
    }

    interface PlacesSearchResultItem {
      id: string;
      place_name: string;
      address_name: string;
      road_address_name: string;
      x: string;
      y: string;
    }

    interface Address {
      address_name: string;
    }

    interface RoadAddress {
      address_name: string;
      building_name?: string;
    }

    class Geocoder {
      coord2Address(
        x: number,
        y: number,
        callback: (
          result: Array<{
            address?: Address;
            road_address?: RoadAddress;
          }>,
          status: Status,
        ) => void,
      ): void;
    }

    class Places {
      setMap(map: Map | null): void;
      keywordSearch(
        keyword: string,
        callback: (
          result: PlacesSearchResultItem[],
          status: Status,
          pagination: unknown,
        ) => void,
        options?: { size?: number; location?: LatLng; radius?: number; sort?: SortBy },
      ): void;
      categorySearch(
        categoryCode: string,
        callback: (
          result: PlacesSearchResultItem[],
          status: Status,
          pagination: unknown,
        ) => void,
        options?: { size?: number; location?: LatLng; radius?: number; sort?: SortBy },
      ): void;
    }
  }
}

declare interface Window {
  kakao?: typeof kakao;
}

declare const kakao: {
  maps: typeof kakao.maps;
};
