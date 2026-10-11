-- ===========================================================================
-- DICTEE 1B - de accounts aanmaken
-- ===========================================================================
--
-- DEEL 1 - doe je in het scherm, niet hier (één keer, ongeveer vijf minuten)
--
--   a) Authentication > Providers > Email:
--         "Confirm email" UIT.
--      Anders wacht elke leerling op een bevestigingsmail die nooit aankomt.
--
--   b) Authentication > Users > Add user > Create new user, per leerling:
--         Email:    voornaam@1b.kleurenpalet.intern     (alles klein, geen spaties)
--         Password: het woord dat op zijn kaartje komt
--         "Auto Confirm User" AAN
--      Doe hetzelfde voor jezelf, met je echte e-mailadres.
--
--   c) Kopieer van elke gebruiker de User UID (de lange code).
--
-- DEEL 2 - plak de UID's hieronder in en draai dit in de SQL Editor.
-- ===========================================================================

insert into leerling (id, voornaam, traject, rol) values
  ('PLAK-HIER-DE-UID', 'Voornaam1', '1B',    'leerling'),
  ('PLAK-HIER-DE-UID', 'Voornaam2', '1B',    'leerling'),
  ('PLAK-HIER-DE-UID', 'Voornaam3', '1B-vb', 'leerling'),
  ('PLAK-HIER-DE-UID', 'Baron',     '1B',    'meester')
on conflict (id) do update
  set voornaam = excluded.voornaam,
      traject  = excluded.traject,
      rol      = excluded.rol;

-- Controle: dit moet je klaslijst tonen.
select voornaam, traject, rol from leerling order by rol desc, voornaam;
