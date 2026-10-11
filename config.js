// De twee gegevens van het Supabase-project kleurenpalet-1b.
//
// Deze sleutel MAG hier staan: een publishable key is bedoeld om publiek te zijn.
// De beveiliging zit in de toegangsregels (RLS) in de database, niet in het
// geheimhouden van deze sleutel. De service_role-sleutel hoort hier NOOIT -
// die geeft volledige toegang tot alles.

window.CONFIG = {
  SUPABASE_URL: "https://oovbmymtkutwbrfxwxet.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ADlbl1SD24YMPNvImOW0Qg_OV0E6goa",

  // Het verzonnen e-maildomein voor de aanmelding van de leerlingen.
  // Er gaat nooit post naartoe; het is enkel de sleutel waarmee Supabase werkt.
  MAILDOMEIN: "1b.kleurenpalet.intern",
};
