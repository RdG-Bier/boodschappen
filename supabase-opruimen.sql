-- ============================================================
--  Opruimen: dubbele huishoudens bekijken en verwijderen
--  Voer de blokken één voor één uit in Supabase > SQL Editor.
--  Blok 1 en 2 kijken alleen; blok 3 verwijdert echt.
-- ============================================================


-- ---------- BLOK 1: welke huishoudens bestaan er ----------
select x->>'hh'    as code,
       x->>'name'  as naam,
       x->>'alias' as eenvoudige_code
from public.kv, jsonb_array_elements(value::jsonb) as x
where key = 'bd:index:v1'
order by 2, 1;


-- ---------- BLOK 2: wie zit waar, en hoeveel staat er in ----------
-- Kolom is_oprichter laat zien wie het huishouden beheert.
select substring(m.key from 7 for 8)                as code,
       p->>'name'                                    as naam,
       (p->>'uid') = (m.value::jsonb->>'owner')      as is_oprichter,
       to_timestamp(((p->>'seen')::bigint) / 1000)   as laatst_actief
from public.kv m, jsonb_array_elements(m.value::jsonb->'people') as p
where m.key like 'bd:hh:%:members'
order by 1, 3 desc nulls last, 2;

-- Hoeveel data hangt er aan elk huishouden? Het huishouden met de
-- meeste tekens is normaal gesproken degene die je wilt houden.
select substring(key from 7 for 8) as code,
       count(*)                    as onderdelen,
       sum(length(value))          as tekens
from public.kv
where key like 'bd:hh:%'
group by 1
order by 3 desc;


-- ---------- BLOK 3: een huishouden weggooien ----------
-- Vul hieronder op BEIDE plekken de code in die weg mag (8 tekens,
-- zonder streepje, precies zoals in blok 1). Dit is niet terug te draaien.

-- 3a. lijst, historie, leden en instellingen van dat huishouden
delete from public.kv
where key like 'bd:hh:' || 'VULCODEIN' || ':%';

-- 3b. uit het overzicht halen
update public.kv
set value = (
      select coalesce(jsonb_agg(x), '[]'::jsonb)::text
      from jsonb_array_elements(value::jsonb) as x
      where x->>'hh' <> 'VULCODEIN'
    ),
    updated_at = now()
where key = 'bd:index:v1';

-- Controleer daarna blok 1 opnieuw: er hoort nu één Pergo te staan.


-- ---------- Los: iemand uit een huishouden halen ----------
-- Vul de code van het huishouden en de naam in die weg mag.
-- update public.kv
-- set value = jsonb_set(
--       value::jsonb,
--       '{people}',
--       coalesce((select jsonb_agg(p) from jsonb_array_elements(value::jsonb->'people') p
--                 where lower(p->>'name') <> lower('Piet')), '[]'::jsonb)
--     )::text,
--     updated_at = now()
-- where key = 'bd:hh:' || 'VULCODEIN' || ':members';
