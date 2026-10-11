-- ===========================================================================
-- DICTEE 1B - tabellen en toegangsregels
-- Plak dit in Supabase > SQL Editor > New query > Run.
-- Je mag het zonder schade een tweede keer draaien.
-- ===========================================================================

-- ------------------------------------------------------------- de klaslijst
create table if not exists leerling (
  id       uuid primary key references auth.users on delete cascade,
  voornaam text not null,
  traject  text not null default '1B',      -- '1B' of '1B-vb'
  rol      text not null default 'leerling' -- 'leerling' of 'meester'
);

-- ------------------------------------------------------------- de resultaten
create table if not exists dictee_resultaat (
  id          bigint generated always as identity primary key,
  leerling_id uuid not null references leerling(id) on delete cascade,
  dictee      text not null,          -- '1B-d01'
  traject     text,
  soort       text not null,          -- 'toets' (oefeningen worden niet bewaard)
  punten      int  not null,
  totaal      int  not null,
  fouten      jsonb not null default '[]',
  gemaakt     timestamptz not null default now()
);
create index if not exists idx_resultaat_leerling on dictee_resultaat(leerling_id, gemaakt desc);

-- ------------------------------------------------------------- wat openstaat
create table if not exists openstaat (
  traject    text primary key,
  tot_nummer int not null default 0,
  bijgewerkt timestamptz not null default now()
);
insert into openstaat (traject, tot_nummer) values ('1B', 6), ('1B-vb', 6)
  on conflict (traject) do nothing;

-- ===========================================================================
-- TOEGANGSREGELS - sla deze NIET over.
-- Zonder deze regels kan iedereen met de anon-sleutel alles lezen en schrijven.
-- ===========================================================================
alter table leerling         enable row level security;
alter table dictee_resultaat enable row level security;
alter table openstaat        enable row level security;

-- Een hulpfunctie die zegt of de aangemelde gebruiker de meester is.
-- 'security definer' betekent: deze functie kijkt zelf langs de regels heen,
-- anders zou de regel op 'leerling' zichzelf blijven oproepen.
create or replace function is_meester() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'meester' from leerling where id = auth.uid()), false);
$$;

-- ---- klaslijst: je ziet jezelf; de meester ziet iedereen
drop policy if exists leerling_lezen on leerling;
create policy leerling_lezen on leerling
  for select using (auth.uid() = id or is_meester());

-- Niemand kan via de app in de klaslijst schrijven. Dat doe jij in Supabase zelf.

-- ---- resultaten: je schrijft en leest enkel je eigen; de meester leest alles
drop policy if exists resultaat_eigen_lezen on dictee_resultaat;
create policy resultaat_eigen_lezen on dictee_resultaat
  for select using (auth.uid() = leerling_id or is_meester());

drop policy if exists resultaat_eigen_schrijven on dictee_resultaat;
create policy resultaat_eigen_schrijven on dictee_resultaat
  for insert with check (auth.uid() = leerling_id);

-- Een leerling kan een resultaat niet aanpassen of wissen: er is bewust geen
-- update- of delete-regel. Jij kunt dat wel, in Supabase zelf.

-- ---- openstaat: iedereen die aangemeld is mag lezen, enkel de meester schrijft
drop policy if exists openstaat_lezen on openstaat;
create policy openstaat_lezen on openstaat
  for select using (auth.role() = 'authenticated');

drop policy if exists openstaat_schrijven on openstaat;
create policy openstaat_schrijven on openstaat
  for all using (is_meester()) with check (is_meester());
