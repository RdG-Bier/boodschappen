-- ============================================================
--  Jezelf herstellen als oprichter
--  Werkt in elk huishouden waarin je onder v_nu staat.
--  Pas alleen de regels onder DECLARE aan en voer het geheel uit.
-- ============================================================

do $$
declare
  -- De naam waaronder je NU in de app staat:
  v_nu     text := 'Piet';

  -- De naam die je wilt hebben:
  v_naam   text := 'RdG';

  -- Andere leden uit die huishoudens gooien? true = alleen jij blijft over.
  -- Zet op false als er iemand in zit die moet blijven.
  v_alleen boolean := true;

  -- Alleen één bepaald huishouden? Vul dan de 8-tekencode in.
  -- Laat leeg om alle huishoudens te doen waarin je voorkomt.
  v_code   text := '';

  r        record;
  j        jsonb;
  mijn     text;
  laatste  text := null;
  n        int := 0;
begin
  for r in
    select distinct m.key as k
    from public.kv m, jsonb_array_elements(m.value::jsonb->'people') p
    where m.key like 'bd:hh:%:members'
      and lower(p->>'name') = lower(v_nu)
      and (v_code = '' or m.key = 'bd:hh:' || v_code || ':members')
    order by 1
  loop
    select value::jsonb into j from public.kv where key = r.k;

    select p->>'uid' into mijn
    from jsonb_array_elements(j->'people') p
    where lower(p->>'name') = lower(v_nu)
    limit 1;

    -- naam bijwerken, eventueel de rest verwijderen
    j := jsonb_set(j, '{people}', (
          select coalesce(jsonb_agg(
                   case when p->>'uid' = mijn
                        then jsonb_set(jsonb_set(p, '{name}', to_jsonb(v_naam)),
                                       '{ini}', to_jsonb(upper(left(v_naam, 1))))
                        else p end), '[]'::jsonb)
          from jsonb_array_elements(j->'people') p
          where v_alleen = false or p->>'uid' = mijn));

    -- jij wordt oprichter, blokkeerlijst leeg
    j := jsonb_set(j, '{owner}', to_jsonb(mijn));
    j := jsonb_set(j, '{blocked}', '[]'::jsonb);

    update public.kv set value = j::text, updated_at = now() where key = r.k;

    laatste := mijn;
    n := n + 1;
    raise notice 'Bijgewerkt: %', r.k;
  end loop;

  if laatste is null then
    raise exception 'Geen lid gevonden met de naam %. Kijk met blok 2 van supabase-opruimen.sql welke namen er staan.', v_nu;
  end if;

  -- beheerder van de gedeelde catalogus
  insert into public.kv (key, value, updated_at)
  values ('bd:admin:v1', jsonb_build_object('uid', laatste, 'name', v_naam)::text, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();

  raise notice 'Klaar: % is oprichter van % huishouden(s) en beheert de catalogus.', v_naam, n;
end $$;


-- Controle: hier hoort jouw naam te staan met is_oprichter = true
select substring(m.key from 7 for 8)           as code,
       p->>'name'                               as naam,
       (p->>'uid') = (m.value::jsonb->>'owner') as is_oprichter
from public.kv m, jsonb_array_elements(m.value::jsonb->'people') as p
where m.key like 'bd:hh:%:members'
order by 1, 3 desc;
