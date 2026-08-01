-- ============================================================
--  Update 2: overzicht voor de beheerder + opruimen op naam
--  Nieuwe query, plakken, Run. Bestaande data blijft staan.
-- ============================================================

-- ---------- Overzicht van alle huishoudens ----------
-- Geeft naam, begin van de code en de leden. Nooit lijsten of historie.
-- Werkt alleen als je het kenmerk van de beheerder meestuurt, dus
-- een willekeurige bezoeker krijgt niets terug.
create or replace function public.huis_overzicht(p_uid text)
returns table (naam text, code_begin text, leden text)
language sql
security definer
set search_path = public
as $$
  select x->>'name',
         left(x->>'hh', 4),
         (select string_agg(p->>'name', ', ' order by p->>'name')
          from public.kv m2, jsonb_array_elements(m2.value::jsonb->'people') as p
          where m2.key = 'bd:hh:' || (x->>'hh') || ':members')
  from public.kv, jsonb_array_elements(value::jsonb) as x
  where key = 'bd:index:v1'
    and exists (select 1 from public.kv a
                where a.key = 'bd:admin:v1'
                  and a.value::jsonb->>'uid' = p_uid)
  order by 1;
$$;

grant execute on function public.huis_overzicht(text) to anon, authenticated;


-- ---------- Een huishouden weggooien op naam ----------
-- Vul hieronder de naam in. Hoofdletters maken niet uit.
-- Dit verwijdert lijst, historie, leden en instellingen. Niet terug te draaien.
do $$
declare
  v_naam text := 'Adres X';
  v_hh   text;
  n      int := 0;
begin
  for v_hh in
    select x->>'hh'
    from public.kv, jsonb_array_elements(value::jsonb) as x
    where key = 'bd:index:v1' and lower(x->>'name') = lower(v_naam)
  loop
    delete from public.kv where key like 'bd:hh:' || v_hh || ':%';

    update public.kv
    set value = (select coalesce(jsonb_agg(y), '[]'::jsonb)::text
                 from jsonb_array_elements(value::jsonb) as y
                 where y->>'hh' <> v_hh),
        updated_at = now()
    where key = 'bd:index:v1';

    n := n + 1;
    raise notice 'Verwijderd: % (%)', v_naam, v_hh;
  end loop;

  if n = 0 then
    raise notice 'Geen huishouden gevonden met de naam %', v_naam;
  end if;
end $$;


-- Controle: welke huishoudens zijn er nu nog?
select x->>'name' as naam, x->>'hh' as code, x->>'alias' as eenvoudige_code
from public.kv, jsonb_array_elements(value::jsonb) as x
where key = 'bd:index:v1'
order by 1;
