-- ===========================================================================
-- DICTEE 1B - de leerlingen maken zelf een account
-- Plak dit in Supabase > SQL Editor > Run, NA 01-tabellen.sql.
-- ===========================================================================
--
-- Wat dit regelt: een leerling meldt zich aan met zijn schooladres en kiest zelf
-- een wachtwoord. De app maakt daarna zijn rij in de klaslijst. Drie sloten:
--
--   1. alleen een adres op het schooldomein mag een rij maken;
--   2. je kunt alleen een rij voor JEZELF maken (auth.uid() = id);
--   3. je kunt jezelf nooit 'meester' maken - dat doe jij hieronder met de hand.
--
-- Deze controle staat in de DATABASE. Iemand die de pagina omzeilt en rechtstreeks
-- met de sleutel praat, komt er dus ook niet door.
-- ===========================================================================

-- >>> staat het schooldomein hier anders? Pas het op DEZE twee plaatsen aan. <<<

drop policy if exists leerling_zelf_aanmaken on leerling;
create policy leerling_zelf_aanmaken on leerling
  for insert with check (
    auth.uid() = id
    and rol = 'leerling'
    and lower(auth.jwt() ->> 'email') like '%@kleurenpalet.be'
  );

-- zijn voornaam of traject nog eens verbeteren mag; zichzelf bevorderen niet
drop policy if exists leerling_zelf_bijwerken on leerling;
create policy leerling_zelf_bijwerken on leerling
  for update using (auth.uid() = id and rol = 'leerling')
  with check (auth.uid() = id and rol = 'leerling');


-- ===========================================================================
-- JOUW EIGEN MEESTERACCOUNT
-- Registreer je eerst gewoon via de website, met je schooladres. Daarna maak je
-- jezelf hiermee meester - dat kan alleen hier, niet via de app.
-- ===========================================================================
-- update leerling set rol = 'meester'
--   where id = (select id from auth.users where email = 'dimitri.vanweymeersch@kleurenpalet.be');

-- Controle: wie staat er in de klaslijst?
select l.voornaam, l.traject, l.rol, u.email
from leerling l join auth.users u on u.id = l.id
order by l.rol desc, l.voornaam;
