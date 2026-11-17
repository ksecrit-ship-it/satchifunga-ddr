#!/usr/bin/env python3
"""Prüft die veröffentlichte Fassung auf Sprachgrenze, interne Dateien und Seitenbau.

Verbotene Formulierungen sind nur als SHA-256 hinterlegt. Verglichen wird jede
Teilzeichenfolge nach casefold(), nie der Klartext in dieser Datei.
"""

from __future__ import annotations

import hashlib
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
# (Länge der casefolded Formulierung, SHA-256 hex). Kein Klartext.
FORBIDDEN_SHA256 = (
    (10, "57493b8a3412fa511e5f8c8919a1dcf78619df166d36050167a9430ba0ca537a"),
    (9, "a9c8e0825018d225c2dbf3a7c0ea2fa8b23118d2eb843e8087c1c4d8461ec43d"),
    (8, "82d16a948698d49b6e6bb3b7c088d81d03a01bd4caadaf19dbf5e5797d6dad9f"),
    (26, "cd282449a7a40c674ed8a2de5fb01071062b9cc52571cc108dfda92191599f17"),
    (7, "1e110ea8f2a771ecf590242330c0e7f77b8f09e2808e8a5a2727cdebaeefa90f"),
    (7, "23184f84909d7af8ba431b9d41cc736258159a87c9531208d55257fbb63fb5b4"),
    (6, "949972b5ed2d9f718658a9e8bbc9cffc95f199743e08b4fa45392ced23a08095"),
    (7, "5705e04f9ac403856125d6f356cd79d623e63496e1f7ca25e26271571f9d27b5"),
    (7, "59a32f3f5eb539410666eebc775cc8acb3e46a83b0ced3b031587a22989f86bb"),
    (14, "bd8c8c2a2b01b098baee3789edf7324dfbf87e73253860d1b59c9326bcf6c05f"),
    (14, "963f66381e71ec411be7fae0bc8a7030baf7540b216c02aea0ba82fb12c07d6b"),
    (6, "2f07094aafbfa869a4160de4c7857124f3c127714aff5ed07b063c309d855c40"),
    (6, "c055b6fb160973205dc4cf38fd98154da5fb2ae7f3055f32226db29e0aeedd8d"),
    (8, "bd013366ba6f5a8d6f20496d3d874a2d98269aa7555d90a51c08e7a84eaf13d5"),
    (4, "719c7d42ee5a3276e3ed9e92dd3319a90fdceb42dbd23838794e98fc1e554d50"),
    (10, "b3f5c02c29be4651e05f3f50bbdc83063a50f84b6056a949beb78b13063467b6"),
    (9, "984bc8175268efd6658b2a45593252577b6dc798aab8c29c0549e00bc0ab0b76"),
    (5, "1cf936bb19f1c3b0e7e70312cb72dd1c039a5d5b128cbd46460c93e718f6d079"),
    (10, "1124004a1545b0bc285cc58a27f06da7837504b1fc7750e8dd13f8deefeecb17"),
    (16, "9077b9a4e5267930475c48d95ad2cf3d2606a5637d92f3fec757b46ec5c93f49"),
)


def fail(message: str) -> None:
    print(f"FEHLER: {message}", file=sys.stderr)
    raise SystemExit(1)


def forbidden_digest(text: str) -> str | None:
    """SHA-256 der ersten casefolded Teilzeichenfolge, die einer Regel entspricht."""
    lowered = text.casefold()
    by_length: dict[int, set[str]] = {}
    for length, digest in FORBIDDEN_SHA256:
        by_length.setdefault(length, set()).add(digest)
    for length, digests in by_length.items():
        if length <= 0 or length > len(lowered):
            continue
        last = len(lowered) - length + 1
        for index in range(last):
            digest = hashlib.sha256(lowered[index:index + length].encode("utf-8")).hexdigest()
            if digest in digests:
                return digest
    return None


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
    checker_source = Path(__file__).read_text(encoding="utf-8")
    digest = forbidden_digest(blob) or forbidden_digest(checker_source)
    if digest:
        fail(f"Verbotener Inhalt, SHA-256 {digest[:12]}")
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
            if forbidden_digest(url) or forbidden_digest(file_info["filename"]):
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
