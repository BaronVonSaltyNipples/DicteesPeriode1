/* ===========================================================================
   DICTEE 1B - de app voor de leerling
   ---------------------------------------------------------------------------
   Twee soorten:
     oefening  - meteen groen of rood, je mag opnieuw proberen, telt niet mee
     toets     - een keer, geen hulp, de score gaat naar de meester

   De zin wordt voorgelezen MET het woord erin, daarna het woord nog eens apart.
   Dat is precies wat je in de klas doet. Op het scherm staat de zin met een gat,
   dus er valt niets over te schrijven.

   De volgorde van de woorden verschilt per leerling en per poging, zodat
   overschrijven bij de buur niet helpt.
   =========================================================================== */

const $ = (s) => document.querySelector(s);
const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

let ik = null;        // { id, voornaam, traject }
let alles = null;     // dictees.json
let open = {};        // { '1B': 6, '1B-vb': 6 }
let gedaan = {};      // { '1B-d01|toets': {punten, totaal} }
let ronde = null;     // de lopende oefening of toets

/* ======================================================= schermen wisselen */
const SCHERMEN = ["v-aanmelden", "v-keuze", "v-dictee", "v-einde"];
function toon(id) {
  SCHERMEN.forEach((s) => ($("#" + s).hidden = s !== id));
  window.scrollTo(0, 0);
}

/* ======================================================= voorlezen */
const Stem = {
  stem: null,
  klaar: false,

  zoek() {
    const alle = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    if (!alle.length) return false;
    // liefst Vlaams, anders Nederlands, anders wat er is
    this.stem =
      alle.find((v) => /^nl[-_]BE/i.test(v.lang)) ||
      alle.find((v) => /^nl/i.test(v.lang)) ||
      null;
    this.klaar = true;
    if (!this.stem) $("#praat-waarschuwing").hidden = false;
    return true;
  },

  start() {
    if (!window.speechSynthesis) { $("#praat-waarschuwing").hidden = false; return; }
    if (!this.zoek()) speechSynthesis.addEventListener("voiceschanged", () => this.zoek(), { once: true });
  },

  _zeg(tekst, tempo) {
    return new Promise((af) => {
      if (!window.speechSynthesis) return af();
      const u = new SpeechSynthesisUtterance(tekst);
      if (this.stem) u.voice = this.stem;
      u.lang = this.stem ? this.stem.lang : "nl-BE";
      u.rate = tempo;
      u.pitch = 1;
      u.onend = af;
      u.onerror = af;
      speechSynthesis.speak(u);
    });
  },

  stil() { if (window.speechSynthesis) speechSynthesis.cancel(); },
  wacht(ms) { return new Promise((af) => setTimeout(af, ms)); },

  /* de zin, een stilte, dan het woord - en dat woord nog een tweede keer */
  async zinEnWoord(zin, woord) {
    this.stil();
    await this._zeg(zin, 0.85);
    await this.wacht(700);
    await this._zeg(woord, 0.75);
    await this.wacht(500);
    await this._zeg(woord, 0.7);
  },

  async enkelWoord(woord) {
    this.stil();
    await this._zeg(woord, 0.7);
  },
};

/* ======================================================= husselen per leerling */
// Een vaste volgorde per (leerling, dictee, poging): bij het herladen van de
// bladzijde blijft ze dus gelijk, maar de buur heeft een andere.
function zaadje(tekst) {
  let h = 2166136261;
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function toevalMet(zaad) {
  let s = zaad || 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}
function hussel(rij, zaad) {
  const uit = rij.slice();
  const toeval = toevalMet(zaad);
  for (let i = uit.length - 1; i > 0; i--) {
    const j = Math.floor(toeval() * (i + 1));
    [uit[i], uit[j]] = [uit[j], uit[i]];
  }
  return uit;
}

/* ======================================================= vergelijken */
function schoon(t) {
  return (t || "").trim().replace(/\s+/g, " ").replace(/[.…]+$/, "");
}
function beoordeel(gegeven, juist) {
  const a = schoon(gegeven), b = schoon(juist);
  if (a === b) return "goed";
  if (a.toLowerCase() === b.toLowerCase()) return "hoofdletter";
  return "mis";
}

/* ======================================================= aanmelden */
function mailVan(voornaam) {
  const slug = voornaam.trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  return slug + "@" + CONFIG.MAILDOMEIN;
}

$("#form-aanmelden").addEventListener("submit", async (e) => {
  e.preventDefault();
  const knop = e.target.querySelector("button");
  const fout = $("#aanmeldfout");
  fout.hidden = true;
  knop.disabled = true;
  knop.textContent = "Even geduld…";

  const { error } = await db.auth.signInWithPassword({
    email: mailVan($("#voornaam").value),
    password: $("#wachtwoord").value,
  });

  knop.disabled = false;
  knop.textContent = "Aanmelden";

  if (error) {
    fout.textContent = "Dat klopt niet. Kijk je voornaam en je geheime woord nog eens na.";
    fout.hidden = false;
    $("#wachtwoord").value = "";
    $("#wachtwoord").focus();
    return;
  }
  await naBinnen();
});

$("#afmelden").addEventListener("click", async () => {
  await db.auth.signOut();
  location.reload();
});

/* ======================================================= opstarten */
async function naBinnen() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) { toon("v-aanmelden"); return; }

  const { data: rij, error } = await db
    .from("leerling").select("id, voornaam, traject, rol").eq("id", user.id).single();

  if (error || !rij) {
    $("#aanmeldfout").textContent =
      "Je bent aangemeld, maar je staat nog niet in de klaslijst. Zeg het aan de meester.";
    $("#aanmeldfout").hidden = false;
    await db.auth.signOut();
    toon("v-aanmelden");
    return;
  }

  ik = rij;
  $("#wie").textContent = rij.voornaam;
  $("#wie").hidden = false;
  $("#afmelden").hidden = false;

  const [o, g] = await Promise.all([haalOpen(), haalGedaan()]);
  open = o; gedaan = g;

  bouwLijst();
  toon("v-keuze");
}

async function haalOpen() {
  const { data } = await db.from("openstaat").select("traject, tot_nummer");
  const uit = {};
  (data || []).forEach((r) => (uit[r.traject] = r.tot_nummer));
  return uit;
}

async function haalGedaan() {
  const { data } = await db
    .from("dictee_resultaat")
    .select("dictee, soort, punten, totaal")
    .eq("leerling_id", ik.id)
    .order("gemaakt", { ascending: false });
  const uit = {};
  (data || []).forEach((r) => {
    const sleutel = r.dictee + "|" + r.soort;
    if (!uit[sleutel]) uit[sleutel] = r;   // het meest recente
  });
  return uit;
}

/* ======================================================= de lijst */
function bouwLijst() {
  const lijst = $("#lijst");
  lijst.innerHTML = "";
  const tot = open[ik.traject] || 0;
  const mijne = (alles[ik.traject] || []).filter((d) => d.nummer <= tot);

  $("#geenopen").hidden = mijne.length > 0;

  mijne.forEach((d) => {
    const toets = gedaan[d.id + "|toets"];
    const kaart = document.createElement("div");
    kaart.className = "kaart" + (toets ? " af" : "");
    kaart.innerHTML = `
      <span class="naam">${veilig(d.titel)}</span>
      ${toets ? `<span class="speld klaar">toets: ${toets.punten}/${toets.totaal}</span>` : ""}
      <span class="sub">${d.zinnen.length} woorden</span>`;

    const oef = document.createElement("button");
    oef.className = "knop stil";
    oef.textContent = "Oefenen";
    oef.onclick = () => startDictee(d, "oefening");

    const tst = document.createElement("button");
    tst.className = "knop";
    tst.textContent = toets ? "Toets opnieuw" : "Toets";
    tst.onclick = () => {
      if (toets && !confirm("Je deed deze toets al. Nog een keer doen? De nieuwe score telt.")) return;
      startDictee(d, "toets");
    };

    kaart.append(oef, tst);
    lijst.append(kaart);
  });
}

function veilig(t) {
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}

/* ======================================================= een dictee doen */
function startDictee(dictee, soort) {
  const poging = Date.now();
  const zaad = zaadje(ik.id + "|" + dictee.id + "|" + soort + "|" +
                      (soort === "toets" ? dictee.id : poging));
  ronde = {
    dictee, soort,
    rij: hussel(dictee.zinnen, zaad),
    nu: 0,
    punten: 0,
    fouten: [],
    begonnen: new Date().toISOString(),
  };

  $("#d-titel").textContent = dictee.titel;
  $("#d-soort").textContent = soort === "toets" ? "toets" : "oefening";
  $("#d-soort").className = "speld" + (soort === "toets" ? " toets" : "");
  toon("v-dictee");
  toonWoord();
}

function toonWoord() {
  const item = ronde.rij[ronde.nu];
  const n = ronde.rij.length;

  $("#d-balk").style.width = Math.round((ronde.nu / n) * 100) + "%";
  $("#d-teller").textContent = `Woord ${ronde.nu + 1} van ${n}`;
  $("#d-zin").innerHTML = metGat(item.zin, item.woord);

  const invul = $("#d-invul");
  invul.value = "";
  invul.disabled = false;
  $("#d-verder").disabled = false;
  $("#d-verder").textContent = ronde.soort === "toets" ? "Verder" : "Nakijken";
  $("#d-oordeel").hidden = true;
  invul.focus();

  // meteen voorlezen
  luister();
}

/* De zin op het scherm met een gat waar het woord hoort. Zo kan de leerling
   niets overschrijven, maar ziet hij wel waar het woord staat.

   Het moet een HEEL woord zijn: in "Papa harkt de bladeren met de hark" mag het gat
   niet op 'harkt' vallen. Daarom zoeken we met woordgrenzen, en eerst met dezelfde
   hoofdletters als het antwoord. */
function metGat(zin, woord) {
  const esc = woord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const grens = "(?:^|[^A-Za-zÀ-ÿ'])";
  const na = "(?![A-Za-zÀ-ÿ'])";
  for (const vlag of ["", "i"]) {            // eerst hoofdlettergevoelig, dan pas niet
    const re = new RegExp(grens + "(" + esc + ")" + na, vlag);
    const m = re.exec(zin);
    if (m) {
      const begin = m.index + m[0].length - m[1].length;
      return veilig(zin.slice(0, begin)) + '<span class="gat"></span>' +
             veilig(zin.slice(begin + m[1].length));
    }
  }
  return veilig(zin);
}

let praat = false;
async function luister() {
  if (praat) return;
  praat = true;
  $("#d-luister").dataset.praat = "1";
  const item = ronde.rij[ronde.nu];
  await Stem.zinEnWoord(item.zin, item.woord);
  $("#d-luister").dataset.praat = "0";
  praat = false;
}

$("#d-luister").addEventListener("click", luister);
$("#d-nogeens").addEventListener("click", async () => {
  if (praat) { Stem.stil(); praat = false; $("#d-luister").dataset.praat = "0"; }
  praat = true;
  $("#d-luister").dataset.praat = "1";
  await Stem.enkelWoord(ronde.rij[ronde.nu].woord);
  $("#d-luister").dataset.praat = "0";
  praat = false;
});

// plakken heeft geen zin bij een dictee
$("#d-invul").addEventListener("paste", (e) => e.preventDefault());
$("#d-invul").addEventListener("drop", (e) => e.preventDefault());

$("#form-woord").addEventListener("submit", (e) => {
  e.preventDefault();
  Stem.stil();
  const item = ronde.rij[ronde.nu];
  const gegeven = $("#d-invul").value;
  const oordeel = beoordeel(gegeven, item.woord);

  if (oordeel === "goed") ronde.punten++;
  else ronde.fouten.push({ zin: item.zin, juist: item.woord, gegeven: schoon(gegeven), soort: oordeel });

  if (ronde.soort === "oefening") {
    toonOordeel(oordeel, item.woord);
    $("#d-invul").disabled = true;
    $("#d-verder").disabled = true;
    setTimeout(volgende, oordeel === "goed" ? 1100 : 2600);
  } else {
    volgende();
  }
});

function toonOordeel(oordeel, juist) {
  const p = $("#d-oordeel");
  p.hidden = false;
  if (oordeel === "goed") {
    p.className = "oordeel goed";
    p.textContent = "Juist!";
  } else if (oordeel === "hoofdletter") {
    p.className = "oordeel mis";
    p.innerHTML = "Bijna — let op de hoofdletter." +
      `<span class="juist">Het is: <b>${veilig(juist)}</b></span>`;
  } else {
    p.className = "oordeel mis";
    p.innerHTML = "Niet juist." + `<span class="juist">Het is: <b>${veilig(juist)}</b></span>`;
  }
}

function volgende() {
  ronde.nu++;
  if (ronde.nu < ronde.rij.length) toonWoord();
  else einde();
}

$("#d-stop").addEventListener("click", () => {
  if (!confirm("Stoppen? Wat je al deed, wordt niet bewaard.")) return;
  Stem.stil();
  ronde = null;
  toon("v-keuze");
});

/* ======================================================= einde */
async function einde() {
  Stem.stil();
  const n = ronde.rij.length;
  const p = ronde.punten;

  $("#e-titel").textContent = ronde.soort === "toets" ? "Je toets is klaar" : "Goed geoefend!";
  $("#e-score").innerHTML = `${p} <small>van ${n}</small>`;

  const deel = p / n;
  $("#e-boodschap").textContent =
    deel === 1 ? "Alles juist. Knap werk!" :
    deel >= 0.8 ? "Dat is al heel goed." :
    deel >= 0.5 ? "Je bent goed op weg. Oefen de woorden hieronder nog eens." :
                  "Oefen deze woorden nog eens rustig. Het komt wel.";

  const ul = $("#e-fouten");
  ul.innerHTML = "";
  $("#e-kop-fouten").hidden = ronde.fouten.length === 0;
  ronde.fouten.forEach((f) => {
    const li = document.createElement("li");
    li.innerHTML =
      `<span class="jij">${veilig(f.gegeven || "—")}</span>` +
      `<span class="moet">${veilig(f.juist)}</span>`;
    ul.append(li);
  });

  $("#e-opnieuw").onclick = () => startDictee(ronde.dictee, "oefening");

  if (ronde.soort === "toets") {
    await db.from("dictee_resultaat").insert({
      leerling_id: ik.id,
      dictee: ronde.dictee.id,
      traject: ik.traject,
      soort: "toets",
      punten: p,
      totaal: n,
      fouten: ronde.fouten,
    });
    gedaan = await haalGedaan();
  }

  toon("v-einde");
}

$("#e-terug").addEventListener("click", () => { bouwLijst(); toon("v-keuze"); });

/* ======================================================= start */
(async function () {
  Stem.start();
  try {
    alles = await (await fetch("dictees.json")).json();
  } catch (e) {
    $("#aanmeldfout").textContent = "De dictees konden niet geladen worden. Herlaad de bladzijde.";
    $("#aanmeldfout").hidden = false;
    return;
  }
  const { data: { session } } = await db.auth.getSession();
  if (session) await naBinnen();
  else toon("v-aanmelden");
})();
