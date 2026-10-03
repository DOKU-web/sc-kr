-- SC-KR 사이트 리뷰 게시판 — Supabase SQL Editor에 통째로 붙여넣고 Run 하세요.
-- 맨 아래 'CHANGE_ME' 를 본인만 아는 관리자 키로 바꾼 뒤 실행해야 합니다 (리뷰 삭제용).
--
-- 구조
--  - reviews 테이블: 방문자는 '쓰기'만 가능 (RLS). 원본 닉네임은 외부에서 읽을 수 없음.
--  - get_reviews(): 닉네임을 * 로 가린 결과만 돌려주는 공개 함수.
--  - delete_review(): 관리자 키가 맞을 때만 리뷰를 숨김(삭제) 처리.

create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  nickname    text not null check (char_length(btrim(nickname)) between 1 and 20),
  rating      smallint not null check (rating between 1 and 5),
  content     text not null check (char_length(btrim(content)) between 2 and 500),
  hidden      boolean not null default false
);

alter table public.reviews enable row level security;

-- 방문자(anon)는 새 리뷰 추가만 가능. 읽기/수정/삭제 정책은 만들지 않음 → 원본 데이터 비공개.
drop policy if exists "anyone can write a review" on public.reviews;
create policy "anyone can write a review" on public.reviews
  for insert to anon, authenticated
  with check (hidden = false);

-- 도배 방지: 같은 내용 10분 내 재등록 금지, 전체적으로 1분에 20개 초과 금지
create or replace function public.reviews_flood_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.nickname := btrim(new.nickname);
  new.content  := btrim(new.content);
  if exists (select 1 from public.reviews
             where content = new.content and created_at > now() - interval '10 minutes') then
    raise exception 'duplicate review';
  end if;
  if (select count(*) from public.reviews where created_at > now() - interval '1 minute') >= 20 then
    raise exception 'too many reviews, try again later';
  end if;
  return new;
end $$;

drop trigger if exists reviews_flood_guard on public.reviews;
create trigger reviews_flood_guard before insert on public.reviews
  for each row execute function public.reviews_flood_guard();

-- 닉네임 가리기: 1자 → *, 2자 → 홍*, 3~5자 → 홍*동 / ab**e, 6자 이상 → ne*******g
create or replace function public.mask_nickname(n text) returns text
language sql immutable as $$
  select case
    when char_length(n) <= 1 then '*'
    when char_length(n) = 2 then left(n, 1) || '*'
    when char_length(n) <= 5 then left(n, 1) || repeat('*', char_length(n) - 2) || right(n, 1)
    else left(n, 2) || repeat('*', char_length(n) - 3) || right(n, 1)
  end
$$;

-- 공개 목록 (가린 닉네임만)
create or replace function public.get_reviews(p_limit int default 50, p_offset int default 0)
returns table (id bigint, created_at timestamptz, nickname text, rating smallint, content text)
language sql stable security definer set search_path = public as $$
  select r.id, r.created_at, public.mask_nickname(r.nickname), r.rating, r.content
  from public.reviews r
  where not r.hidden
  order by r.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;

-- 평균 별점 / 개수
create or replace function public.get_review_stats()
returns table (total bigint, average numeric)
language sql stable security definer set search_path = public as $$
  select count(*), round(avg(rating)::numeric, 1) from public.reviews where not hidden
$$;

-- 관리자 키 (외부에서 읽을 수 없는 테이블)
create table if not exists public.review_admin (
  id   int primary key default 1 check (id = 1),
  key_hash text not null
);
alter table public.review_admin enable row level security;  -- 정책 없음 → anon 접근 불가

create or replace function public.delete_review(p_id bigint, p_key text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.review_admin
                 where key_hash = encode(digest(p_key, 'sha256'), 'hex')) then
    raise exception 'invalid admin key';
  end if;
  update public.reviews set hidden = true where id = p_id;
  return found;
end $$;

revoke all on function public.delete_review(bigint, text) from public;
grant execute on function public.get_reviews(int, int) to anon, authenticated;
grant execute on function public.get_review_stats() to anon, authenticated;
grant execute on function public.delete_review(bigint, text) to anon, authenticated;
grant insert (nickname, rating, content) on public.reviews to anon, authenticated;

-- ▼▼ 'CHANGE_ME' 를 관리자 키로 바꾸세요 (리뷰 삭제할 때 입력하는 값) ▼▼
insert into public.review_admin (id, key_hash)
values (1, encode(digest('CHANGE_ME', 'sha256'), 'hex'))
on conflict (id) do update set key_hash = excluded.key_hash;
