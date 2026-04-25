# Mapper

지도 기반 실시간 약속/미팅 PWA.  
친구들과 약속을 만들고 목적지를 정하면, 서로의 실시간 위치와 ETA(예상 도착 시간)가 지도 위에 표시됩니다.

## 스택

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Kakao Maps JavaScript SDK** + **Kakao Places**
- **OpenRouteService** (경로/ETA), fallback **OSRM public API**
- **Supabase** (Postgres + Auth + Realtime)
- **Vercel** 배포, **PWA** 설치 가능

## 개발 시작

```bash
npm install
cp .env.example .env.local   # Supabase URL/Key 채우기
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 위치 권한을 허용해야 내 위치가 표시됩니다.

## Supabase 설정

1. https://supabase.com 에서 무료 프로젝트 생성
2. Project Settings → API 에서 URL / anon key 를 `.env.local` 에 복사
3. SQL Editor에서 `supabase/schema.sql` 실행 (테이블 + RLS 생성)
4. Authentication → Providers 에서 **Email** 활성화 (매직링크), Anonymous sign-ins 도 활성화

## Kakao Maps 설정

1. https://developers.kakao.com 에서 앱 생성
2. 앱 설정 → 플랫폼 → Web 에서 개발/배포 도메인 등록
3. 앱 설정 → 앱 키에서 JavaScript 키를 `.env.local` 의 `NEXT_PUBLIC_KAKAO_MAP_APPKEY` 에 복사
4. 서버측 지하철역 검색까지 쓰려면 REST API 키를 `.env.local` 의 `KAKAO_REST_API_KEY` 에 추가
5. SDK가 로드되지 않으면 등록한 Web 도메인과 현재 접속 주소가 정확히 일치하는지 확인

## ETA 설정

1. https://openrouteservice.org/dev/#/signup 에서 무료 API 키 생성
2. `.env.local` 에 `ORS_API_KEY` 추가
3. ETA는 ORS를 우선 사용하고, 실패 시 OSRM public API로 fallback 됩니다
4. 지도/검색은 Kakao Maps를 사용하고, ETA 계산만 별도 경로 엔진을 사용합니다

## 지하철 베타 설정

1. 수도권 지하철 추천 경로 베타를 쓰려면 `.env.local` 에 `SEOUL_SUBWAY_API_KEY` 를 추가
2. 지하철 모드는 현재 수도권 우선 베타이며, 공식 경로 응답이 없으면 추정 시간으로 fallback 됩니다
3. 미팅룸 지도에서는 교통/자전거 오버레이와 주변 지하철역 표시를 토글할 수 있습니다

## 주요 화면

- `/` — 홈 (약속 만들기 / 참여하기)
- `/new` — 새 약속 만들기 (목적지 검색 + 핀)
- `/m/[id]` — 실시간 지도 미팅 화면

## 폴더 구조

```
src/
  app/            # Next.js App Router 페이지
  components/     # Map, Meeting, Search 등 컴포넌트
  lib/            # supabase, geo(OSRM/Nominatim), realtime
  hooks/          # useMyLocation, useMeetingChannel, useRoute
  stores/         # Zustand 스토어
supabase/
  schema.sql      # DB 스키마 + RLS
public/
  manifest.json
  icons/
```
