-- ============================================================
--  Update: eenvoudige eigen code per huishouden
--  Plak dit in Supabase > SQL Editor en voer het uit.
--  Je bestaande data blijft staan.
-- ============================================================

-- De oude versie zonder alias eruit, anders zijn er twee functies
-- met dezelfde naam en weet de API niet welke hij moet hebben.
drop function if exists public.huis_add(text, text);

-- Huishouden aanmelden of bijwerken, nu met een zelfgekozen code
create or replace function public.huis_add(p_hh text, p_name text, p_alias text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  a text := lower(trim(coalesce(p_alias, '')));
begin
  if p_hh is null or length(p_hh) <> 8 then
    raise exception 'ongeldige code';
  end if;

  select coalesce(value::jsonb, '[]'::jsonb) into v
  from public.kv where key = 'bd:index:v1';

  if v is null then
    v := '[]'::jsonb;
  end if;

  -- eenvoudige code mag niet al bij een ander huishouden horen
  if a <> '' and exists (
    select 1 from jsonb_array_elements(v) x
    where lower(coalesce(x->>'alias', '')) = a and x->>'hh' <> p_hh
  ) then
    raise exception 'die eenvoudige code is al in gebruik';
  end if;

  v := coalesce(
        (select jsonb_agg(x) from jsonb_array_elements(v) x where x->>'hh' <> p_hh),
        '[]'::jsonb)
       || jsonb_build_object(
            'hh', p_hh,
            'name', left(coalesce(p_name, 'Huishouden'), 60),
            'alias', left(a, 30));

  insert into public.kv (key, value, updated_at)
  values ('bd:index:v1', v::text, now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now();
end;
$$;

-- Volledige code opzoeken via de eenvoudige code
create or replace function public.huis_alias(p_alias text)
returns text
language sql
security definer
set search_path = public
as $$
  select x->>'hh'
  from public.kv, jsonb_array_elements(value::jsonb) as x
  where key = 'bd:index:v1'
    and lower(coalesce(x->>'alias', '')) = lower(trim(coalesce(p_alias, '')))
    and coalesce(x->>'alias', '') <> ''
  limit 1;
$$;

grant execute on function public.huis_add(text, text, text) to anon, authenticated;
grant execute on function public.huis_alias(text)           to anon, authenticated;

-- Controle: hoort geen foutmelding te geven.
-- select * from public.huis_index();
