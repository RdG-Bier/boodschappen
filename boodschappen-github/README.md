# Boodschappen — GitHub Pages + Supabase

Boodschappenlijst voor het hele huishouden. Meerdere huishoudens naast elkaar, elk met
eigen catalogus, lijst en historie. Draait gratis: GitHub Pages voor de app, Supabase
voor de gedeelde data. Geen serverkosten, geen deploy-limiet zoals bij Netlify.

## Wat waar staat

| soort data | waar | wie ziet het |
|---|---|---|
| catalogus, winkellijst, historie, leden | Supabase | iedereen met dezelfde huishoudcode |
| je naam en je huishoudcodes | `localStorage` van je browser | alleen dat toestel |

`src/App.jsx` bevat de hele app. `src/storage.js` regelt de opslag. Wil je later naar
een andere backend, dan is dat het enige bestand dat verandert.

---

## Stap 1 — Supabase klaarzetten (5 minuten)

1. Maak een gratis account op [supabase.com](https://supabase.com) en daarna een nieuw
   project. Regio Frankfurt of Amsterdam is voor Nederland het snelst.
2. Ga in het project naar **SQL Editor**, klik *New query*.
3. Open `supabase.sql` uit deze map, kopieer de volledige inhoud, plak die in de editor
   en klik **Run**. Je hoort een groene melding te krijgen.
4. Ga naar **Project Settings → API** en noteer:
   * **Project URL** (ziet uit als `https://abcdefgh.supabase.co`)
   * **anon public** key (een lange sleutel)

Na het uitvoeren kan het een halve minuut duren voordat Supabase de nieuwe functies
zichtbaar maakt voor de app. Krijg je in het begin een foutmelding over een onbekende
functie, wacht dan even en herlaad.

Wat het script doet: het maakt één tabel `kv` aan en zet die volledig dicht. Alle
toegang loopt via zes databasefuncties. Daardoor kan niemand met de publieke sleutel
even de hele tabel leegtrekken, en geeft het huishoudenoverzicht alleen namen terug met
de eerste vier tekens van de code.

## Stap 2 — Sleutels invullen

Open `src/config.js` en vul je Project URL en anon key in.

De anon key **hoort** publiek te zijn; die mag gewoon in de repo. Zet er nooit de
`service_role` key in — die geeft volledige toegang tot je database.

Wil je de sleutels liever buiten de repo houden: zet ze als repository secrets met de
namen `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON`. De workflow pakt ze dan automatisch
op. Ze komen dan nog steeds in de gebouwde JavaScript terecht — dat kan niet anders bij
een app zonder eigen server — maar staan niet in je broncode.

## Stap 3 — Naar GitHub

```bash
git init
git add .
git commit -m "Boodschappenlijst"
git branch -M main
git remote add origin https://github.com/JOUWNAAM/boodschappen.git
git push -u origin main
```

Zet daarna in de repo **Settings → Pages** de optie **Source** op **GitHub Actions**.
Dat is de enige instelling die je moet aanraken.

Vanaf nu bouwt elke push naar `main` de app en zet hem live. Je vindt de voortgang onder
het tabblad **Actions**. De link staat na de eerste geslaagde run onder Settings → Pages
en ziet uit als `https://jouwnaam.github.io/boodschappen/`.

## Stap 4 — In gebruik nemen

1. Open de link. Vul je naam in en start een huishouden. Je krijgt een code.
2. Ga naar **Beheer → Huishouden** en zet de link van de app in het veld
   "Link naar deze app".
3. Tik op **Via WhatsApp** om de uitnodiging met code te versturen.
4. Op de telefoon: browsermenu → *Toevoegen aan beginscherm*. Daarna opent hij als app
   zonder adresbalk.

Familie die zelf wil bijhouden opent dezelfde link en kiest *Nieuw huishouden starten*.

## Lokaal werken

```bash
npm install
npm run dev        # http://localhost:5173
```

Werkt direct tegen je Supabase-project, dus je kunt op je laptop testen met dezelfde
lijst als op je telefoon.

---

## Goed om te weten

* De huishoudcode **scheidt** huishoudens; hij beveiligt ze niet. Wie de volledige code
  kent, kan meelezen en meeschrijven. Voor een boodschappenlijst is dat prima; voor een
  product dat je verkoopt wil je echte accounts (Supabase Auth) en policies per
  gebruiker.
* De app haalt elke 12 seconden wijzigingen op, en alleen als het tabblad in beeld is.
  Ruim binnen de gratis limieten van Supabase.
* Supabase pauzeert gratis projecten na een week zonder activiteit. Eén keer de app
  openen wekt het weer, maar als jullie hem echt gebruiken gebeurt dat nooit.
* Wil je later instant sync in plaats van elke 12 seconden: Supabase heeft realtime
  subscriptions. Dat vraagt de `@supabase/supabase-js` client en een aanpassing in
  `storage.js`; de rest van de app kan blijven staan.

## Bestanden

```
supabase.sql                  eenmalig in Supabase uitvoeren
src/config.js                 jouw Project URL en anon key
src/storage.js                opslaglaag (Supabase + localStorage)
src/App.jsx                   de app zelf: 2018 artikelen, huishoudens, cijfers
src/main.jsx                  startpunt, waarschuwt als de config ontbreekt
index.html                    omhulsel met PWA-meta's, zoom uitgeschakeld
vite.config.js                relatieve paden, nodig voor github.io/reponaam/
public/manifest.webmanifest   naam, kleuren, iconen voor het beginscherm
public/sw.js                  service worker: app-shell uit cache
.github/workflows/deploy.yml  bouwt en publiceert bij elke push naar main
```
