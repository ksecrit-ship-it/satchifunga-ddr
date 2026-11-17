#!/usr/bin/env python3
"""Prüft die veröffentlichte Fassung auf Sprachgrenze, interne Dateien und Seitenbau."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANNER = "ENTWURF – Freigabe an Investoren erst nach Gate 1 sowie NDA/KYC"
GEOLOGY = "Explorationsziel ca. 28.000–180.000 ct, keine Ressource."
INTERN_IDS = (
    "1FXndPRwwmkHIqittNf3J9Nt4DgWXnTMQ",
    "1D-RmOxsfXaMLAjmKXqAgf-z7GBFTX6oE",
)
FORBIDDEN = (
    "Abbaurecht",
    "NI 43-101",
    "NI43-101",
    "National Instrument 43-101",
    "188.000",
    "188,000",
    "188000",
    "3,5 Mrd",
    "3.5 Mrd",
    "3,5 Milliarden",
    "3.5 Milliarden",
    "3.5 bn",
    "3,5 bn",
    "5 bn USD",
    "5 bn",
    "5 Mrd. USD",
    "5 Mrd USD",
    "ouid=",
    "NUR_INTERN",
    "/workspace/sachi",
)


def fail(message: str) -> None:
    print(f"FEHLER: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    data_path = ROOT / "data" / "documents.json"
    room = json.loads(data_path.read_text(encoding="utf-8"))
    if room["meta"]["banner"] != BANNER:
        fail("Banner in documents.json weicht ab")
    if room["meta"]["geology"] != GEOLOGY:
        fail("Geologieaussage in documents.json weicht ab")
    if "SAMREC/CRIRSCO" not in json.dumps(room, ensure_ascii=False):
        fail("SAMREC/CRIRSCO fehlt")

    texts = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in {".git", "_site", "tools", ".github"} for part in path.parts):
            continue
        if path.suffix.lower() in {".pdf", ".docx", ".xlsx", ".doc", ".xls", ".ppt", ".pptx"}:
            fail(f"Dokumentdatei im Repository: {path.relative_to(ROOT)}")
        if path.suffix.lower() in {".html", ".json", ".js", ".css", ".md", ".txt", ".svg"} or path.name in {"CNAME", "robots.txt"}:
            texts.append((path, path.read_text(encoding="utf-8")))

    blob = "\n".join(text for _, text in texts)
    lowered = blob.lower()
    for token in FORBIDDEN:
        if token.lower() in lowered:
            fail(f"Verbotener Inhalt: {token}")
    for file_id in INTERN_IDS:
        if file_id in blob:
            fail(f"Interne Drive-ID veröffentlicht: {file_id}")
    if GEOLOGY not in blob:
        fail("Zulässige Geologieaussage fehlt")

    html_files = [item for item in texts if item[0].suffix == ".html"]
    if len(html_files) < 15:
        fail("Zu wenige HTML-Seiten")
    for path, text in html_files:
        if BANNER not in text:
            fail(f"Banner fehlt in {path.relative_to(ROOT)}")
        if 'name="robots" content="noindex,nofollow"' not in text:
            fail(f"robots-Meta fehlt in {path.relative_to(ROOT)}")
        if 'lang="de"' not in text:
            fail(f"Sprache fehlt in {path.relative_to(ROOT)}")

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if "Disallow: /" not in robots:
        fail("robots.txt sperrt nicht alles")
    if (ROOT / "CNAME").exists():
        fail("CNAME darf in diesem Prototyp nicht liegen, sonst leitet github.io auf eine noch nicht gesetzte Domain um")
    hrefs = {zone["href"] for zone in room["zones"]}
    expected_hrefs = {
        "00_Index/",
        "00_Lobby_Teaser/",
        "01_NDA_Gate/",
        "02_Deal_Room/",
        "02_Deal_Room/02.1_Titel_und_Behoerdenpapiere/",
        "02_Deal_Room/02.2_Gesellschaft_und_Register/",
        "02_Deal_Room/02.3_Vertraege/",
        "02_Deal_Room/02.4_Geologie/",
        "02_Deal_Room/02.5_Umwelt_und_Genehmigungen/",
        "02_Deal_Room/02.6_Finanzen/",
        "03_QA_Desk/",
        "04_Deal_Desk/",
        "05_Gap_Register/",
        "06_Source_Register_und_Disclosure/",
    }
    if hrefs != expected_hrefs:
        fail(f"Ordnerstruktur weicht von Drive ab: {sorted(hrefs ^ expected_hrefs)}")

    documents = room["documents"]
    urls = []
    internal = [doc for doc in documents if doc.get("internalOnly")]
    if len(internal) != 1 or internal[0]["files"]:
        fail("Gesamtbewertung muss genau einmal und ohne Link vorkommen")
    stopped = [doc for doc in documents if doc.get("doNotUse")]
    if len(stopped) != 1 or "nicht_verwenden" not in stopped[0]["files"][0]["filename"]:
        fail("Kennzeichnung der englischen CIM-Fassung fehlt")
    for doc in documents:
        for file_info in doc["files"]:
            url = file_info["viewUrl"]
            urls.append(url)
            if not url.startswith("https://drive.google.com/") and not url.startswith("https://docs.google.com/"):
                fail(f"Unerlaubte URL: {url}")
            if "ouid=" in url or "NUR_INTERN" in file_info["filename"]:
                fail(f"Sensible URL oder Datei: {file_info['filename']}")
    if len(urls) != 77 or len(set(urls)) != 77:
        fail(f"Erwartet 77 eindeutige Datei-Links, gefunden {len(urls)} / {len(set(urls))}")

    zone_ids = {zone["id"] for zone in room["zones"]}
    for doc in documents:
        if doc["zone"] not in zone_ids:
            fail(f"Unbekannte Zone: {doc['zone']}")
    print(f"OK: {len(documents)} Einträge, {len(urls)} Dateilinks, {len(html_files)} Seiten")


if __name__ == "__main__":
    main()
