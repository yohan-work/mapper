"use client";

let kakaoMapsPromise: Promise<typeof kakao> | null = null;

export async function loadKakaoMaps(): Promise<typeof kakao> {
  if (typeof window === "undefined") {
    throw new Error("Kakao 지도는 브라우저에서만 로드할 수 있습니다.");
  }

  if (window.kakao?.maps) {
    return await loadSdkNamespace(window.kakao);
  }

  if (!kakaoMapsPromise) {
    kakaoMapsPromise = new Promise((resolve, reject) => {
      const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APPKEY;
      if (!appKey) {
        reject(
          new Error(
            "Kakao 지도 키가 없습니다. NEXT_PUBLIC_KAKAO_MAP_APPKEY 를 .env.local 에 설정하세요.",
          ),
        );
        return;
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-kakao-maps-sdk="true"]',
      );

      const handleLoad = () => {
        if (!window.kakao?.maps) {
          reject(new Error("Kakao 지도 SDK를 불러오지 못했습니다."));
          return;
        }
        window.kakao.maps.load(() => resolve(window.kakao!));
      };

      if (existingScript) {
        existingScript.addEventListener("load", handleLoad, { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Kakao 지도 SDK 스크립트 로드에 실패했습니다.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.dataset.kakaoMapsSdk = "true";
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener(
        "error",
        () => reject(new Error("Kakao 지도 SDK 스크립트 로드에 실패했습니다.")),
        { once: true },
      );
      document.head.appendChild(script);
    });
  }

  return await kakaoMapsPromise;
}

async function loadSdkNamespace(kakaoSdk: typeof kakao): Promise<typeof kakao> {
  return await new Promise((resolve) => {
    kakaoSdk.maps.load(() => resolve(kakaoSdk));
  });
}
