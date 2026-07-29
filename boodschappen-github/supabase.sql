-- ============================================================
--  Boodschappen — opslag in Supabase
--  Plak dit hele bestand in Supabase > SQL Editor en voer het uit.
--  Je hoeft dit maar één keer te doen.
-- ============================================================

-- 1. De tabel: één rij per sleutel, waarde is tekst (json van de app)
create table if not exists public.kv (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

-- 2. Tabel volledig dichtzetten. Alles gaat via de functies hieronder,
--    zodat niemand met de publieke sleutel de hele tabel kan uitlezen.
alter table public.kv enable row level security;
revoke all on table public.kv from anon, authenticated;

-- ------------------------------------------------------------
-- 3. Lezen en schrijven per sleutel
-- ------------------------------------------------------------

-- De index met huishoudens is hier bewust uitgesloten: die mag alleen
-- via huis_index() en huis_zoek(), zodat codes niet zomaar op te halen zijn.
create or replace function public.kv_get(p_key text)
returns text
language sql
security definer
set search_path = public
as $$
  select value from public.kv
  where key = p_key and p_key <> 'bd:index:v1';
$$;

create or replace function public.kv_set(p_key text, p_value text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.kv (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now();
$$;

create or replace function public.kv_del(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.kv where key = p_key and p_key <> 'bd:index:v1';
$$;

-- ------------------------------------------------------------
-- 4. Huishoudens: naam wel zichtbaar, code niet
-- ------------------------------------------------------------

-- Huishouden aanmelden of hernoemen
create or replace function public.huis_add(p_hh text, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if p_hh is null or length(p_hh) <> 8 then
    raise exception 'ongeldige code';
  end if;

  select coalesce(value::jsonb, '[]'::jsonb) into v
  from public.kv where key = 'bd:index:v1';

  if v is null then
    v := '[]'::jsonb;
  end if;

  -- oude vermelding van deze code eruit, nieuwe erbij
  v := coalesce(
        (select jsonb_agg(x) from jsonb_array_elements(v) x where x->>'hh' <> p_hh),
        '[]'::jsonb)
       || jsonb_build_object('hh', p_hh, 'name', left(coalesce(p_name, 'Huishouden'), 60));

  insert into public.kv (key, value, updated_at)
  values ('bd:index:v1', v::text, now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now();
end;
$$;

-- Overzicht: alleen naam en de eerste vier tekens van de code
create or replace function public.huis_index()
returns table (name text, pre text)
language sql
security definer
set search_path = public
as $$
  select x->>'name', left(x->>'hh', 4)
  from public.kv, jsonb_array_elements(value::jsonb) as x
  where key = 'bd:index:v1'
  order by 1;
$$;

-- Volledige code alleen als de laatste vier tekens kloppen
create or replace function public.huis_zoek(p_pre text, p_rest text)
returns text
language sql
security definer
set search_path = public
as $$
  select x->>'hh'
  from public.kv, jsonb_array_elements(value::jsonb) as x
  where key = 'bd:index:v1'
    and upper(x->>'hh') = upper(coalesce(p_pre, '') || coalesce(p_rest, ''))
  limit 1;
$$;

-- ------------------------------------------------------------
-- 5. Rechten: de app mag alleen deze functies aanroepen
-- ------------------------------------------------------------
grant execute on function public.kv_get(text)          to anon, authenticated;
grant execute on function public.kv_set(text, text)    to anon, authenticated;
grant execute on function public.kv_del(text)          to anon, authenticated;
grant execute on function public.huis_add(text, text)  to anon, authenticated;
grant execute on function public.huis_index()          to anon, authenticated;
grant execute on function public.huis_zoek(text, text) to anon, authenticated;

-- Klaar. Controle: dit hoort een lege lijst te geven, geen foutmelding.
-- select * from public.huis_index();
