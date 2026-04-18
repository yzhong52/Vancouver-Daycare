#!/usr/bin/env python3
"""
Geocode enriched_vacancies.csv using the BC Address Geocoder (free, no key required)
and write processed_data/geocoded_vacancies.csv for map.html to consume.

Usage:
    python geocode_vacancies.py
"""

import csv
import json
import logging
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

_ROOT = Path(__file__).parent
INPUT_CSV  = _ROOT / "processed_data" / "enriched_vacancies.csv"
OUTPUT_CSV = _ROOT / "processed_data" / "geocoded_vacancies.csv"
LOG_FILE   = _ROOT / "logs" / "geocode_vacancies.log"
GEOCODER_URL = "https://geocoder.api.gov.bc.ca/addresses.json"

FIELDNAMES = [
    "name", "address", "neighbourhood", "phone", "email", "website",
    "languages", "age_groups", "curriculum", "contact_date", "vacancies",
    "lat", "lng", "geocode_score",
]

LOG_FILE.parent.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)


def geocode(address: str) -> tuple[float | None, float | None, int]:
    params = urllib.parse.urlencode({
        "addressString": address + ", Vancouver, BC",
        "maxResults": 1,
        "outputSRS": 4326,
    })
    try:
        with urllib.request.urlopen(f"{GEOCODER_URL}?{params}", timeout=10) as resp:
            data = json.loads(resp.read())
        features = data.get("features", [])
        if features:
            coords = features[0]["geometry"]["coordinates"]
            score = features[0]["properties"].get("score", 0)
            return coords[1], coords[0], score  # lat, lng, score
    except Exception as e:
        log.error(e)
    return None, None, 0


def main() -> None:
    if not INPUT_CSV.exists():
        log.error(f"{INPUT_CSV} not found. Run enrich_vacancies.py first.")
        sys.exit(1)

    with open(INPUT_CSV, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    results = []
    for i, row in enumerate(rows):
        address = row["location"].strip()
        if not address:
            log.info(f"[{i+1}/{len(rows)}] SKIP (no address): {row['name']}")
            lat, lng, score = None, None, 0
        else:
            lat, lng, score = geocode(address)
            status = f"OK (score={score})" if lat else "FAIL"
            log.info(f"[{i+1}/{len(rows)}] {status}: {address}")
            time.sleep(0.15)  # be polite to the API

        results.append({
            "name": row["name"],
            "address": address,
            "neighbourhood": row["neighbourhood"],
            "phone": row["phone"],
            "email": row["email"],
            "website": row["website"],
            "languages": row["languages"],
            "age_groups": row["age_groups"],
            "curriculum": row["curriculum"],
            "contact_date": row["contact_date"],
            "vacancies": row["vacancies"],
            "lat": lat or "",
            "lng": lng or "",
            "geocode_score": score,
        })

    OUTPUT_CSV.parent.mkdir(exist_ok=True)
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(results)

    placed = sum(1 for r in results if r["lat"])
    log.info(f"Done. {placed}/{len(results)} geocoded → {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
