/* ===========================================================================
   DICTEE 1B - het scherm voor de meester
   Resultaten per leerling, en de schakelaar die zegt tot welk dictee er
   opengesteld is. Enkel wie in de tabel 'leerling' rol = 'meester' heeft,
   krijgt hier iets te zien; dat wordt in de database afgedwongen, niet hier.
   =========================================================================== */

const $ = (s) => document.querySelector(s);
const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

let alles = null, leerlingen = [], resultaten = [];

/* In dictees.json staat ook metagegeven (_bron). Dat is geen traject. */
function trajecten() {
  return Object.keys(alles || {}).filter((k) => !k.startsWith("_") && Array.isArray(alles[k]));
}
function alleDictees() {
  return trajecten().flatMap((k) => alles[k]);
}

function veilig(t) { const d = document.createElement("div"); d.textContent = t ?? ""; return d.innerHTML; }
function toon(id) {
  ["v-aanmelden", "v-meester"].forEach((s) => ($("#" + s).hidden = s !== id));
}

/* ------------------------------------------------------------- aanmelden */
$("#form-aanmelden").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#aanmeldfout").hidden = true;
  const { error } = await db.auth.signInWithPassword({
    email: $("#mail").value.trim(),
    password: $("#wachtwoord").value,
  });
  if (error) {
    $("#aanmeldfout").textContent = "Aanmelden lukte niet: " + error.message;
    $("#aanmeldfout").hidden = false;
    return;
  }
  await naBinnen();
});

$("#afmelden").addEventListener("click", async () => { await db.auth.signOut(); location.reload(); });

/* ------------------------------------------------------------- opstarten */
async function naBinnen() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return toon("v-aanmelden");

  const { data: mij } = await db.from("leerling").select("voornaam, rol").eq("id", user.id).single();
  if (!mij || mij.rol !== "meester") {
    $("#aanmeldfout").textContent = "Dit account is geen meesteraccount.";
    $("#aanmeldfout").hidden = false;
    await db.auth.signOut();
    return toon("v-aanmelden");
  }

  $("#wie").textContent = mij.voornaam;
  $("#wie").hidden = false;
  $("#afmelden").hidden = false;
  toon("v-meester");

  await bouwOpen();
  await haalAlles();
}

/* ------------------------------------------------------------- openzetten */
async function bouwOpen() {
  const { data } = await db.from("openstaat").select("traject, tot_nummer");
  const nu = {};
  (data || []).forEach((r) => (nu[r.traject] = r.tot_nummer));

  const vak = $("#open-rijen");
  vak.innerHTML = "";
  trajecten().forEach((traject) => {
    const aantal = alles[traject].length;
    const rij = document.createElement("div");
    rij.className = "kaart";
    rij.innerHTML = `<span class="naam">${veilig(traject)}</span>
      <span class="sub">${aantal} dictees in totaal</span>`;

    const kies = document.createElement("select");
    for (let i = 0; i <= aantal; i++) {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = i === 0 ? "niets open" : `dictee 1 tot en met ${i}`;
      kies.append(o);
    }
    kies.value = nu[traject] ?? 0;
    kies.style.cssText = "padding:9px 12px;font:inherit;border:2px solid var(--lijn);border-radius:10px;background:#fff";

    const bewaar = document.createElement("button");
    bewaar.className = "knop klein";
    bewaar.textContent = "Bewaren";
    bewaar.onclick = async () => {
      bewaar.disabled = true;
      const { error } = await db.from("openstaat")
        .upsert({ traject, tot_nummer: Number(kies.value) });
      bewaar.textContent = error ? "Lukt niet" : "Bewaard";
      setTimeout(() => { bewaar.textContent = "Bewaren"; bewaar.disabled = false; }, 1600);
    };

    rij.append(kies, bewaar);
    vak.append(rij);
  });
}

/* ------------------------------------------------------------- resultaten */
async function haalAlles() {
  const [l, r] = await Promise.all([
    db.from("leerling").select("id, voornaam, traject, rol").order("voornaam"),
    db.from("dictee_resultaat").select("*").order("gemaakt", { ascending: false }).limit(1000),
  ]);
  leerlingen = (l.data || []).filter((x) => x.rol !== "meester");
  resultaten = r.data || [];

  vulKiezer($("#f-leerling"), leerlingen.map((x) => [x.id, x.voornaam]), "alle leerlingen");
  const dicteeNamen = alleDictees().map((d) => [d.id, d.titel]);
  vulKiezer($("#f-dictee"), dicteeNamen, "alle dictees");

  teken();
}

function vulKiezer(sel, paren, kop) {
  const was = sel.value;
  sel.innerHTML = `<option value="">${kop}</option>`;
  paren.forEach(([w, t]) => {
    const o = document.createElement("option");
    o.value = w; o.textContent = t;
    sel.append(o);
  });
  sel.value = was;
}

function titelVan(id) {
  const d = alleDictees().find((x) => x.id === id);
  return d ? d.titel : id;
}
function naamVan(id) {
  const l = leerlingen.find((x) => x.id === id);
  return l ? l.voornaam : "(onbekend)";
}

function gefilterd() {
  const fl = $("#f-leerling").value, fd = $("#f-dictee").value;
  return resultaten.filter((r) => (!fl || r.leerling_id === fl) && (!fd || r.dictee === fd));
}

function teken() {
  const rij = gefilterd();
  const tb = $("#rijen");
  tb.innerHTML = "";
  $("#leeg").hidden = rij.length > 0;

  const toetsen = rij.filter((r) => r.soort === "toets");
  if (toetsen.length) {
    const p = toetsen.reduce((s, r) => s + r.punten, 0);
    const t = toetsen.reduce((s, r) => s + r.totaal, 0);
    $("#samenvatting").textContent =
      `${toetsen.length} toetsen · samen ${p} van ${t} (${Math.round((p / t) * 100)}%)`;
  } else {
    $("#samenvatting").textContent = "";
  }

  rij.forEach((r) => {
    const tr = document.createElement("tr");
    if (r.soort === "toets") tr.className = "rij-toets";

    const cel = (inhoud, klasse) => {
      const td = document.createElement("td");
      if (klasse) td.className = klasse;
      if (typeof inhoud === "string") td.textContent = inhoud;
      else if (inhoud) td.append(inhoud);
      tr.append(td);
      return td;
    };

    cel(naamVan(r.leerling_id));
    cel(titelVan(r.dictee));
    cel(r.soort);
    cel(`${r.punten}/${r.totaal}`, "nr");
    cel(new Date(r.gemaakt).toLocaleString("nl-BE", { dateStyle: "short", timeStyle: "short" }));

    // ---- de fouten: elk antwoord is een knop waarmee je het alsnog goedkeurt
    const tdF = cel(null);
    if (!(r.fouten || []).length) {
      tdF.textContent = "—";
    } else {
      r.fouten.forEach((f, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "foutknop";
        b.title = "Dit antwoord alsnog goedkeuren";
        b.innerHTML = `<span class="jij">${veilig(f.gegeven || "niets")}</span>
                       <span class="pijl">→</span>
                       <span class="moet">${veilig(f.juist)}</span>`;
        b.onclick = () => keurGoed(r, i, b);
        tdF.append(b);
      });
    }

    // ---- wissen: daarna mag de leerling dat dictee opnieuw maken
    const tdW = cel(null, "nr");
    const w = document.createElement("button");
    w.type = "button";
    w.className = "knop klein stil";
    w.textContent = "Wissen";
    w.onclick = () => wisRij(r, w);
    tdW.append(w);

    tb.append(tr);
  });
}

/* Een antwoord dat de app fout rekende, alsnog goedkeuren. Het punt gaat erbij
   en het woord verdwijnt uit de foutenlijst - ook die van de leerling. */
async function keurGoed(r, i, knop) {
  const f = r.fouten[i];
  const vraag = `"${f.gegeven || "niets ingevuld"}" goedkeuren voor "${f.juist}"?\n` +
                `${naamVan(r.leerling_id)} krijgt er een punt bij: ${r.punten + 1}/${r.totaal}.`;
  if (!confirm(vraag)) return;

  knop.disabled = true;
  const over = r.fouten.filter((_, k) => k !== i);
  const punten = r.punten + 1;              // een keer uitrekenen, niet twee keer optellen
  const { error } = await db.from("dictee_resultaat")
    .update({ punten, fouten: over })
    .eq("id", r.id);

  if (error) {
    knop.disabled = false;
    alert("Goedkeuren lukte niet: " + error.message +
          "\n\nStaat _setup/04-meester-rechten.sql al gedraaid?");
    return;
  }
  r.punten = punten;
  r.fouten = over;
  teken();
}

/* Een resultaat wissen. Bij een toets staat die daarna weer open voor de
   leerling; bij een oefening krijgt hij er een oefenbeurt bij. */
async function wisRij(r, knop) {
  const vraag = `De ${r.soort} van ${naamVan(r.leerling_id)} bij "${titelVan(r.dictee)}" wissen?\n` +
                (r.soort === "toets"
                  ? "Hij mag die toets daarna opnieuw maken."
                  : "Hij krijgt er daarmee een oefenbeurt bij, met verse kijkbeurten voor de flitskaart.");
  if (!confirm(vraag)) return;

  knop.disabled = true;
  const { error } = await db.from("dictee_resultaat").delete().eq("id", r.id);
  if (error) {
    knop.disabled = false;
    alert("Wissen lukte niet: " + error.message +
          "\n\nStaat _setup/04-meester-rechten.sql al gedraaid?");
    return;
  }

  // bij een oefening ook de kijkbeurten van de flitskaart vrijgeven
  if (r.soort === "oefening") {
    await db.from("flits_gezien").delete()
      .eq("leerling_id", r.leerling_id).eq("dictee", r.dictee);
  }

  resultaten = resultaten.filter((x) => x.id !== r.id);
  teken();
}

$("#f-leerling").addEventListener("change", teken);
$("#f-dictee").addEventListener("change", teken);
$("#ververs").addEventListener("click", haalAlles);

$("#csv").addEventListener("click", () => {
  const kop = ["leerling", "dictee", "soort", "punten", "totaal", "wanneer", "fouten"];
  const regels = gefilterd().map((r) => [
    naamVan(r.leerling_id), titelVan(r.dictee), r.soort, r.punten, r.totaal,
    new Date(r.gemaakt).toLocaleString("nl-BE"),
    (r.fouten || []).map((f) => `${f.gegeven || "-"} > ${f.juist}`).join(" | "),
  ]);
  const csv = [kop, ...regels]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = "dictees.csv";
  a.click();
});

/* ------------------------------------------------------------- start */
(async function () {
  alles = await (await fetch("dictees.json")).json();
  const { data: { session } } = await db.auth.getSession();
  if (session) await naBinnen(); else toon("v-aanmelden");
})();
