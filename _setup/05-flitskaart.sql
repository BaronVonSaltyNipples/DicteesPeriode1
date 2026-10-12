-- ===========================================================================
-- DICTEE 1B - de teller van de flitskaart
-- Plak dit in Supabase > SQL Editor > New query > Run, NA 01-tabellen.sql.
-- Je mag het zonder schade een tweede keer draaien.
-- ===========================================================================
--
-- Zonder deze tabel telt de app de kijkbeurten enkel in het scherm. Dan krijgt
-- een leerling verse kijkbeurten zodra hij opnieuw begint of de bladzijde
-- herlaadt. Met deze tabel staat de teller in de database: twee keer per woord
-- per dictee, en daarmee uit.
--
-- 'nummer' is het nummer van het woord in dat dictee, niet het woord zelf:
-- in sommige dictees komt hetzelfde woord twee keer voor, in twee zinnen.
-- ===========================================================================

create table if not exists flits_gezien (
  leerling_id uuid not null references leerling(id) on delete cascade,
  dictee      text not null,
  nummer      int  not null,
  aantal      int  not null default 0,
  primary key (leerling_id, dictee, nummer)
);

alter table flits_gezien enable row level security;

-- je ziet enkel je eigen teller; de meester ziet alles
drop policy if exists flits_eigen_lezen on flits_gezien;
create policy flits_eigen_lezen on flits_gezien
  for select using (auth.uid() = leerling_id or is_meester());

drop policy if exists flits_eigen_schrijven on flits_gezien;
create policy flits_eigen_schrijven on flits_gezien
  for insert with check (auth.uid() = leerling_id);

drop policy if exists flits_eigen_bijwerken on flits_gezien;
create policy flits_eigen_bijwerken on flits_gezien
  for update using (auth.uid() = leerling_id) with check (auth.uid() = leerling_id);

-- De teller kan enkel omhoog. Wie met de schermcode knoeit en er 0 van wil
-- maken, krijgt zijn oude waarde terug.
create or replace function flits_enkel_omhoog() returns trigger
language plpgsql as $$
begin
  if new.aantal < old.aantal then new.aantal := old.aantal; end if;
  return new;
end $$;

drop trigger if exists flits_omhoog on flits_gezien;
create trigger flits_omhoog before update on flits_gezien
  for each row execute function flits_enkel_omhoog();

-- enkel de meester kan een teller wissen (gebeurt vanzelf bij 'Wissen')
drop policy if exists flits_meester_wissen on flits_gezien;
create policy flits_meester_wissen on flits_gezien
  for delete using (is_meester());

select 'flits_gezien staat klaar' as melding;
