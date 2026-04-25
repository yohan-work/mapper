-- Mapper schema
-- 실행 전: Authentication → Providers 에서 "Email" 및 "Anonymous Sign-ins" 활성화

create extension if not exists "pgcrypto";

-- profiles: auth.users 1:1 확장
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '익명',
  color text not null default '#0ea5e9',
  created_at timestamptz not null default now()
);

-- meetings
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default '새 약속',
  destination_lat double precision not null,
  destination_lng double precision not null,
  destination_label text not null default '',
  scheduled_at timestamptz,
  status text not null default 'active' check (status in ('scheduled','active','closed')),
  visibility text not null default 'private' check (visibility in ('private','public')),
  join_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  share_token text not null unique default encode(gen_random_bytes(9), 'base64'),
  created_at timestamptz not null default now()
);

alter table public.meetings
  add column if not exists visibility text not null default 'private';

alter table public.meetings
  add column if not exists join_code text not null default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));

alter table public.meetings
  drop constraint if exists meetings_status_check;

alter table public.meetings
  add constraint meetings_status_check
  check (status in ('scheduled','active','closed'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meetings_visibility_check'
  ) then
    alter table public.meetings
      add constraint meetings_visibility_check
      check (visibility in ('private','public'));
  end if;

end $$;

create unique index if not exists meetings_join_code_key on public.meetings (join_code);

-- participants
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '익명',
  color text not null default '#0ea5e9',
  travel_mode text not null default 'driving' check (travel_mode in ('driving','walking','cycling','subway')),
  joined_at timestamptz not null default now(),
  arrived_at timestamptz,
  unique (meeting_id, user_id)
);

alter table public.participants
  drop constraint if exists participants_travel_mode_check;

alter table public.participants
  add constraint participants_travel_mode_check
  check (travel_mode in ('driving','walking','cycling','subway'));

-- locations: 참여자별 최신 스냅샷 1행
create table if not exists public.locations (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  speed double precision,
  accuracy double precision,
  updated_at timestamptz not null default now()
);

-- ==============================
-- RLS
-- ==============================
alter table public.profiles enable row level security;
alter table public.meetings enable row level security;
alter table public.participants enable row level security;
alter table public.locations enable row level security;

-- profiles: 자기 자신만 읽기/쓰기
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- meetings: 누구나 id 로 조회 가능(공유 링크). 생성은 로그인 사용자만. 수정은 생성자만.
drop policy if exists meetings_select_any on public.meetings;
create policy meetings_select_any on public.meetings
  for select using (true);

drop policy if exists meetings_insert_owner on public.meetings;
create policy meetings_insert_owner on public.meetings
  for insert with check (auth.uid() = created_by);

drop policy if exists meetings_update_owner on public.meetings;
create policy meetings_update_owner on public.meetings
  for update using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- participants: 자기 자신의 participant row 만 읽기/쓰기 허용.
-- 주의: participants 를 다시 조회하는 자기참조 정책은 PostgREST/RLS 평가 중
-- 재귀를 일으켜 500 오류를 만들 수 있으므로 사용하지 않는다.
drop policy if exists participants_select_peers on public.participants;
drop policy if exists participants_select_self on public.participants;
create policy participants_select_self on public.participants
  for select using (auth.uid() = user_id);

drop policy if exists participants_insert_self on public.participants;
create policy participants_insert_self on public.participants
  for insert with check (auth.uid() = user_id);

drop policy if exists participants_update_self on public.participants;
create policy participants_update_self on public.participants
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists participants_delete_self on public.participants;
create policy participants_delete_self on public.participants
  for delete using (auth.uid() = user_id);

-- locations: 같은 미팅 참여자끼리 읽기. 본인 participant 만 upsert.
drop policy if exists locations_select_peers on public.locations;
create policy locations_select_peers on public.locations
  for select using (
    exists (
      select 1 from public.participants me, public.participants owner
      where owner.id = locations.participant_id
        and me.meeting_id = owner.meeting_id
        and me.user_id = auth.uid()
    )
  );

drop policy if exists locations_insert_self on public.locations;
create policy locations_insert_self on public.locations
  for insert with check (
    exists (
      select 1 from public.participants p
      where p.id = locations.participant_id and p.user_id = auth.uid()
    )
  );

drop policy if exists locations_update_self on public.locations;
create policy locations_update_self on public.locations
  for update using (
    exists (
      select 1 from public.participants p
      where p.id = locations.participant_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.participants p
      where p.id = locations.participant_id and p.user_id = auth.uid()
    )
  );
