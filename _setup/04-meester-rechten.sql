-- ===========================================================================
-- DICTEE 1B - de meester mag resultaten verbeteren en wissen
-- Plak dit in Supabase > SQL Editor > New query > Run, NA 01-tabellen.sql.
-- Je mag het zonder schade een tweede keer draaien.
-- ===========================================================================
--
-- Hiermee werken de twee knoppen in meester.html:
--
--   * een fout antwoord alsnog goedkeuren  -> update (punten + fouten)
--   * een resultaat wissen                 -> delete
--
-- Enkel wie rol = 'meester' heeft, kan dit. Een leerling niet: voor hem is er
-- nog altijd geen update- of delete-regel, dus hij kan zijn eigen punten niet
-- aanpassen en zijn toets niet wegvegen om opnieuw te beginnen.
-- ===========================================================================

drop policy if exists resultaat_meester_bijwerken on dictee_resultaat;
create policy resultaat_meester_bijwerken on dictee_resultaat
  for update using (is_meester()) with check (is_meester());

drop policy if exists resultaat_meester_wissen on dictee_resultaat;
create policy resultaat_meester_wissen on dictee_resultaat
  for delete using (is_meester());

-- Controle: welke regels staan er nu op de resultaten?
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'dictee_resultaat'
order by cmd, policyname;
