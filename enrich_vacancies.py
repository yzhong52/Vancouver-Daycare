#!/usr/bin/env python3
"""
Enrich vacancies.csv with provider details from providers.csv.

For each vacancy row, finds the best-matching provider using fuzzy name
matching, with phone/email as tiebreakers. Outputs processed_data/enriched_vacancies.csv.
"""

import csv
import re
import sys
from pathlib import Path

from rapidfuzz import fuzz, process

PROVIDERS_CSV = Path("processed_data/providers.csv")
VACANCIES_CSV = Path("processed_data/vacancies.csv")
OUTPUT_CSV = Path("processed_data/enriched_vacancies.csv")

NAME_SCORE_THRESHOLD = 75  # minimum fuzzy name score to accept a match


def extract_phone(text: str) -> str:
    m = re.search(r"[\d]{3}[-.\s][\d]{3}[-.\s][\d]{4}", text)
    return re.sub(r"\D", "", m.group(0)) if m else ""


def extract_email(text: str) -> str:
    m = re.search(r"[\w.+-]+@[\w.-]+\.\w+", text)
    return m.group(0).lower() if m else ""


def find_provider(vacancy: dict, providers: list[dict]) -> tuple[dict, float, str]:
    """Return (best_provider, score, match_method) or ({}, 0, 'none')."""
    vname = vacancy["name"]
    vphone = extract_phone(vacancy["phone_email"])
    vemail = extract_email(vacancy["phone_email"])

    # Phone match (exact digits) — high confidence
    if vphone:
        for p in providers:
            if vphone == extract_phone(p["phone"]):
                return p, 100.0, "phone"

    # Email match — high confidence
    if vemail:
        for p in providers:
            if vemail == p["email"].lower():
                return p, 100.0, "email"

    # Fuzzy name match
    names = [p["name"] for p in providers]
    result = process.extractOne(vname, names, scorer=fuzz.token_sort_ratio)
    if result and result[1] >= NAME_SCORE_THRESHOLD:
        matched_name, score, _ = result
        provider = next(p for p in providers if p["name"] == matched_name)
        return provider, score, "name"

    return {}, 0.0, "none"


def main() -> None:
    for path in (PROVIDERS_CSV, VACANCIES_CSV):
        if not path.exists():
            print(f"Error: {path} not found. Run parse_pdfs.py first.", file=sys.stderr)
            sys.exit(1)

    with open(PROVIDERS_CSV, encoding="utf-8") as f:
        providers = list(csv.DictReader(f))

    with open(VACANCIES_CSV, encoding="utf-8") as f:
        vacancies = list(csv.DictReader(f))

    rows = []
    unmatched = []

    for v in vacancies:
        provider, score, method = find_provider(v, providers)

        if not provider:
            unmatched.append(v["name"])

        rows.append({
            "name": v["name"],
            "contact_date": v["contact_date"],
            "neighbourhood": v["neighbourhood"],
            "vacancies": v["vacancies"],
            "location": provider.get("location", ""),
            "phone": provider.get("phone", "") or extract_phone(v["phone_email"]),
            "email": provider.get("email", "") or extract_email(v["phone_email"]),
            "website": provider.get("website", ""),
            "languages": provider.get("languages", ""),
            "age_groups": provider.get("age_groups", ""),
            "curriculum": provider.get("curriculum", ""),
            "match_method": method,
            "match_score": round(score, 1),
        })

    OUTPUT_CSV.parent.mkdir(exist_ok=True)
    fieldnames = [
        "name", "contact_date", "neighbourhood", "vacancies",
        "location", "phone", "email", "website",
        "languages", "age_groups", "curriculum",
        "match_method", "match_score",
    ]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows → {OUTPUT_CSV}")

    if unmatched:
        print(f"\nNo provider match found for {len(unmatched)} vacancies:")
        for name in unmatched:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
