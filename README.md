# Dictee 1B

Een website waarop de leerlingen hun dictee maken. De zin wordt voorgelezen, daarna
het woord nog eens apart. Op het scherm staat de zin met een gat, dus er valt niets
over te schrijven, en de volgorde van de woorden verschilt per leerling.

Twee soorten:

- **oefening** — meteen groen of rood, je mag opnieuw, telt niet mee;
- **toets** — één keer, geen hulp, de score gaat naar het meesterscherm.

## Wat waar staat

```
index.html      de app voor de leerling
meester.html    de resultaten en de schakelaar "wat staat open"
app.js          de leerlingkant
meester.js      de meesterkant
stijl.css       de opmaak (huisstijl van de bundels)
config.js       >>> hier vul je de twee gegevens van je Supabase-project in <<<
dictees.json    de dictees zelf
netlify.toml    instellingen voor Netlify
_setup/         de SQL om de database klaar te zetten
```

## De dictees die erin zitten

19 dictees voor 1B en 19 voor 1B-vb — week 36 tot en met week 5, dus periode 1, 2 en 3.
Ze zijn rechtstreeks overgenomen uit

`planning/jaarplan 2026_2027/dictee periode 1-2-3/traject …/correctiesleutels dicteetoetsen/*.pdf`,

uit het deel **"deel B – woord in de zin"**. De website toetst dus precies dezelfde zinnen
en dezelfde woorden als de papieren toets, met de bronvermelding (PS3, HA, oefenzin) erbij
in `dictees.json`. Er is niets bijbedacht.

Komt er een periode bij, dan lever je de nieuwe sleutel-pdf aan en wordt `dictees.json`
op dezelfde manier aangevuld.

## Opzetten, één keer

### 1. Supabase

1. `supabase.com` → New project. Naam `kleurenpalet-1b`, **regio Central EU (Frankfurt)**.
2. SQL Editor → plak `_setup/01-tabellen.sql` → Run.
3. SQL Editor → plak `_setup/03-registreren.sql` → Run.
   Daarna `_setup/04-meester-rechten.sql` → Run (voor de knoppen *goedkeuren* en *wissen*).
4. Authentication → Providers → Email → **Confirm email**:
   - **uit**: de leerling kan meteen verder na het registreren (eenvoudigst);
   - **aan**: hij krijgt eerst een mail op zijn schooladres en moet daarop klikken.
5. Project Settings → API: de **Project URL** en de **publishable key** staan al
   in `config.js`.
6. Registreer jezelf via de website, met je schooladres. Maak jezelf daarna meester
   met de regel onderaan `_setup/03-registreren.sql`.

De leerlingen maken hun eigen account: schoolmail, voornaam, groep, zelfgekozen
wachtwoord. `_setup/02-leerlingen.sql` heb je dan niet meer nodig — dat is de oude
manier, met kaartjes.

> De anon-sleutel mag in `config.js` staan — ze is bedoeld om publiek te zijn.
> De beveiliging zit in de toegangsregels van stap 2. De **service_role**-sleutel
> hoort daar nooit: die geeft volledige toegang tot alles.

### 2. Netlify

1. Netlify → Add new site → **Import an existing project** → GitHub → deze repo.
2. Build command leeg laten, publish directory `.`.
3. Deploy. Vanaf dan zet elke wijziging in de repo zichzelf online.

### 3. Wie mag binnen

Alleen een adres op het schooldomein (`kleurenpalet.be`) kan een account maken, en
niemand kan zichzelf meester maken. Die twee sloten zitten in de **database**
(`_setup/03-registreren.sql`), niet in de pagina — wie de website omzeilt en
rechtstreeks met de sleutel praat, komt er dus ook niet door.

Klopt het domein niet, pas het dan op twee plaatsen aan: `SCHOOLDOMEIN` in
`config.js` én de regel met `like '%@kleurenpalet.be'` in dat SQL-bestand.

## Tijdens het jaar

- **Een dictee openzetten**: `meester.html` → kies tot welk nummer. De leerlingen
  zien enkel wat opengezet is.
- **Resultaten bekijken**: `meester.html`, met een filter per leerling of per dictee,
  en een knop om alles als CSV te bewaren.
- **Een antwoord alsnog goedkeuren**: klik in de kolom *Fouten* op dat antwoord. Het punt
  gaat erbij en het woord verdwijnt uit de foutenlijst, ook bij de leerling.
- **Een resultaat wissen**: de knop *Wissen* achteraan de rij. Bij een toets staat die
  daarna weer open voor de leerling; bij een oefening krijgt hij er een oefenbeurt bij.
- **Een dictee toevoegen of wijzigen**: pas `dictees.json` aan. Elke zin is
  `{ "zin": "...", "woord": "..." }`, waarbij `woord` letterlijk in `zin` moet staan —
  daar komt het gat.

## Waar je op moet letten

- Een **gratis Supabase-project pauzeert na ongeveer een week zonder activiteit** en
  moet dan met één klik hervat worden. Tijdens een vakantie gebeurt dat dus.
- Gratis komt **zonder verwerkersovereenkomst**. Hier staan voornamen en punten van
  leerlingen in: leg dat voor aan de directie vóór de klas ermee werkt. Een betaald
  plan of de omgeving van de school kan nodig blijken.
- De **browserstem** verschilt per toestel. Test op één schoolcomputer vóór de hele
  klas begint; staat er geen Nederlandse stem op, dan zegt de app dat zelf.
