// De gegevens van het Supabase-project kleurenpalet-1b.
//
// Deze sleutel MAG hier staan: een publishable key is bedoeld om publiek te zijn.
// De beveiliging zit in de toegangsregels (RLS) in de database, niet in het
// geheimhouden van deze sleutel. De service_role-sleutel hoort hier NOOIT.

window.CONFIG = {
  SUPABASE_URL: "https://oovbmymtkutwbrfxwxet.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ADlbl1SD24YMPNvImOW0Qg_OV0E6goa",

  // Alleen adressen op dit domein mogen een account maken.
  // >>> Klopt dit niet (bv. leerling.kleurenpalet.be), pas het hier én in
  // >>> _setup/03-registreren.sql aan. De database is wat telt; dit is beleefdheid.
  SCHOOLDOMEIN: "kleurenpalet.be",
};
