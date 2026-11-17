# Satchifunga Deal Data Room

Statische Halle für den Deal Data Room des Projekts Satchifunga (Ares Maximus LDA, Angola, Provinz Lunda Sul). Die Website ist das Inhaltsverzeichnis und der Hallenplan. Die Unterlagen selbst liegen nicht in diesem Repository, sondern zugangsbeschränkt in Google Drive.

**ENTWURF – Freigabe an Investoren erst nach Gate 1 sowie NDA/KYC.**

Stand der Aktenlage: 17.11.2026 (Europe/Berlin), Fassung v1.0.

## Seite öffnen

Nach dem Merge auf `main` und der Aktivierung von GitHub Pages:

https://ksecrit-ship-it.github.io/satchifunga-ddr/

Lokal, im Verzeichnis dieses Repositorys:

```bash
python3 -m http.server 8080
```

Dann im Browser `http://localhost:8080/` öffnen. Ein direktes Öffnen der HTML-Datei im Dateisystem lädt `data/documents.json` nicht, weil der Browser den Abruf blockiert.

Alle Links der Website sind relativ, ohne führenden Schrägstrich. So bleibt die Seite unter `https://ksecrit-ship-it.github.io/satchifunga-ddr/` erreichbar. Eine eigene Domain ist in dieser Fassung bewusst nicht eingebunden.

Die Seiten tragen `noindex,nofollow`. `robots.txt` sperrt die gesamte Site.

## Aufbau

```text
index.html                                      Startseite mit Hallenplan und vollständigem Inhaltsverzeichnis
00_Index/                                       Index und Manifest
00_Lobby_Teaser/                                Lobby / Teaser, anonymisiertes Kurzprofil
01_NDA_Gate/                                    NDA-Gate, Zugang, Kontakt
02_Deal_Room/                                   Deal Room, Übersicht der sechs Stände
02_Deal_Room/02.1_Titel_und_Behoerdenpapiere/   02.1 Titel und Behördenpapiere
02_Deal_Room/02.2_Gesellschaft_und_Register/    02.2 Gesellschaft und Register
02_Deal_Room/02.3_Vertraege/                    02.3 Verträge
02_Deal_Room/02.4_Geologie/                     02.4 Geologie
02_Deal_Room/02.5_Umwelt_und_Genehmigungen/     02.5 Umwelt und Genehmigungen, inklusive Arbeitsfassung_maschinell
02_Deal_Room/02.6_Finanzen/                     02.6 Finanzen
03_QA_Desk/                                     Q&A-Desk
04_Deal_Desk/                                   Deal-Desk
05_Gap_Register/                                Lückenregister
06_Source_Register_und_Disclosure/              Quellenregister und Disclosure
data/documents.json                             einzige Pflegedatei für Texte und Unterlagen
css/styles.css                                  Gestaltung
js/app.js                                       Darstellung aus der Pflegedatei
robots.txt                                      Disallow für alle Crawler
.nojekyll                                       verhindert eine Jekyll-Verarbeitung
.github/workflows/pages.yml                     Veröffentlichung über GitHub Pages
tools/check_room.py                             Prüfung vor der Veröffentlichung
```

Die Ordnernamen entsprechen der Ablage in Google Drive. Die Startseite liegt im Wurzelverzeichnis.

Jede Zone ist eine eigene Seite. Die Startseite zeichnet den Weg Lobby → NDA-Gate → Deal Room (02.1 bis 02.6) → Q&A-Desk → Deal-Desk → Lückenregister → Quellenregister. Der Index liegt als Arbeitsverzeichnis daneben.

## Unterlage hinzufügen oder ändern

Nur `data/documents.json` bearbeiten und die Änderung nach `main` schieben. Keine PDF-, Word- oder Excel-Datei in dieses Repository legen. Der Ordner ist öffentlich; die Vertraulichkeit bleibt bei der Drive-Freigabe.

Einen neuen Eintrag in das Array `documents` setzen. `zone` muss eine vorhandene Zonen-ID sein (`index`, `lobby`, `nda`, `titel`, `gesellschaft`, `vertraege`, `geologie`, `umwelt`, `finanzen`, `qa`, `desk`, `luecken`, `quellen`). `group` ist `main` oder, bei den maschinellen Umweltübersetzungen, `arbeitsfassung`.

Muster, keine echte Unterlage:

```json
{
  "id": "titel-neue-unterlage",
  "zone": "titel",
  "group": "main",
  "title": "Titel der Unterlage",
  "description": "Beschreibung aus der Aktenlage, ohne neue Zahlen und ohne neue Wertungen.",
  "grade": "A",
  "kind": "Fakt",
  "reliabilityLabel": "A · Fakt",
  "status": "vorhanden",
  "internalOnly": false,
  "doNotUse": false,
  "files": [
    {
      "label": "PDF",
      "filename": "dateiname.pdf",
      "relpath": "02_Deal_Room/02.1_Titel_und_Behoerdenpapiere/dateiname.pdf",
      "viewUrl": "https://drive.google.com/file/d/DATEI_ID/view?usp=drivesdk",
      "issuer": "Aussteller",
      "date": "TT.MM.JJJJ",
      "language": "PT"
    }
  ]
}
```

Weitere Fassungen derselben Unterlage (Word, Excel, Text) kommen als weitere Objekte in `files`, nicht als eigener Eintrag. Die `viewUrl` ist der Drive-Link zur Ansicht, ohne Parameter wie `ouid`. Word-Dateien nutzen `https://docs.google.com/document/d/DATEI_ID/edit?usp=drivesdk`, Tabellen `https://docs.google.com/spreadsheets/d/DATEI_ID/edit?usp=drivesdk`.

Die interne Gesamtbewertung bleibt ohne `viewUrl`. Der vorhandene Eintrag hat `internalOnly: true` und ein leeres `files`-Array. Diesen Eintrag nicht mit einem Link versehen und keine Datei verlinken, die nur für den internen Gebrauch gekennzeichnet ist.

Vor dem Push lokal prüfen:

```bash
python3 tools/check_room.py
```

Dieselbe Prüfung läuft im Pages-Workflow und bricht die Veröffentlichung ab, wenn sie fehlschlägt. Die verbotenen Formulierungen stehen im Skript nicht im Klartext: es vergleicht SHA-256-Hashes der casefolded Teilzeichenfolgen.

## Startseite ändern

Die Startseite liest drei Stellen in `data/documents.json`:

- `narrative` – die Abschnitte 1 bis 8 (Zweck, Gate, Fakten, Verlässlichkeit, Zonenüberblick, Lücken, Nutzungsregeln). Ein Abschnitt hat `id`, `title` und `blocks` vom Typ `p`, `h`, `ul`, `ol` oder `table`.
- `zones` – Überschrift, Einleitung (`intro`), Zugang (`access`) und Ordner je Stand. Die Stände selbst stehen fest.
- `documents` – die Karten im Inhaltsverzeichnis. Dieselbe Liste erscheint auf der Seite des jeweiligen Standes.

Das Kurzprofil der Lobby steht in `lobbySheet`. Der Zugangstext des NDA-Gates steht in `nda`. Der Banner auf jeder Seite ist fest der Satz aus `meta.banner` und zusätzlich fest in jeder HTML-Datei.

## Sprachgrenze

Beim Ergänzen von Text gilt:

- Einzige Zahlenangabe zur Geologie: `Explorationsziel ca. 28.000–180.000 ct, keine Ressource.`
- Standard ist SAMREC/CRIRSCO.
- Der Titel war ein Prospektionstitel und ist am 15.03.2026 abgelaufen. Ein Betriebstitel wurde nie erteilt.
- Keine Bewertung im Milliardenbereich und keine anderen Karat- oder Wertangaben ergänzen.
- Die englische CIM-OCR-Fassung bleibt als „nicht verwenden“ gekennzeichnet.
- Maschinelle Umweltübersetzungen bleiben in der Gruppe `arbeitsfassung`.

## GitHub Pages

Die Veröffentlichung übernimmt `.github/workflows/pages.yml` bei jedem Push auf `main`. Der Workflow prüft die Sprachgrenze, packt die statischen Dateien und veröffentlicht sie als GitHub-Pages-Artefakt.

In den Repository-Einstellungen unter **Pages** die Quelle **GitHub Actions** wählen, falls das noch nicht gesetzt ist. Liegen Actions nicht vor, alternativ **Deploy from a branch**: Branch `main`, Ordner `/ (root)`. Die Datei `.nojekyll` liegt dafür bereit. Nicht beide Quellen gleichzeitig betreiben.

## Später: eigene Domain

Nicht Teil dieses Prototyps. Solange `datenraum.aresmaximus.com` noch nicht auflöst, liegt keine Datei `CNAME` im Repository. Sonst würde GitHub Pages `https://ksecrit-ship-it.github.io/satchifunga-ddr/` auf die eigene Domain umleiten.

Wenn die Domain später gesetzt wird:

1. Im KAS von All-Inkl einen CNAME-Eintrag anlegen: Name `datenraum`, Ziel `ksecrit-ship-it.github.io`.
2. Erst danach eine Datei `CNAME` mit dem Inhalt `datenraum.aresmaximus.com` ins Repository legen.
3. In den GitHub-Pages-Einstellungen **Enforce HTTPS** aktivieren.

Die Links der Website sind relativ und brauchen dafür keine Anpassung.
