"""
Combines the under-12-months vacancy list with address/contact info
from the full provider directory, and writes a merged CSV.

Inputs:
  - vacancy_list_<month>_<year>_under12months.csv
  - child_care_providers.csv

Output:
  - vacancy_under12months_with_address.csv

Usage:
  /opt/homebrew/bin/python3 combine_vacancy_with_address.py
"""

import csv

VACANCY_FILE = "vacancy_list_april_2026_under12months.csv"
PROVIDERS_FILE = "child_care_providers.csv"
OUTPUT_FILE = "vacancy_under12months_with_address.csv"

# Manual mapping: vacancy list name -> name in child_care_providers.csv
# Update this each week if new entries appear with slightly different names.
NAME_MAPPING = {
    "Happy House In Home Muti-Age Child Care": "Happy House In-Home Multi-Age Child Care",
    "Little Stars Child Care on East 58th": "Little Stars Childcare Center E58th",
    "Cats in the Cradle (RLNR)": "Cats in the Cradle Child Care",
    "Langara Stars Muti-Age Daycare (Group Centre)": "Langara Stars Multi-Age Daycare",
    "Arbutus Child Care & Fine Art Learning Centre": "Arbutus Child Care & Fine Art Learning Centre (Infant/Toddler)",
    "Maple House Academy (Group Child Care for under 3)": "Maple House Academy",
    "The Big Play House (Infant/Toddler Program)": "The Big Playhouse (Infant/Toddler)",
}

# Load provider directory keyed by name
providers = {}
with open(PROVIDERS_FILE, encoding="utf-8") as f:
    for row in csv.DictReader(f):
        providers[row["Program Name"]] = row

# Load vacancy list and merge
with open(VACANCY_FILE, encoding="utf-8") as f:
    vacancies = list(csv.DictReader(f))

rows = []
for v in vacancies:
    pname = NAME_MAPPING.get(v["Program Name"], v["Program Name"])
    p = providers.get(pname, {})
    if not p:
        print(f"WARNING: no provider match for {v['Program Name']!r}")
    rows.append({
        "Program Name": v["Program Name"],
        "Address": p.get("Location", ""),
        "Neighbourhood": v["Neighbourhood"],
        "Phone": p.get("Phone", "") or v["Telephone/Email"],
        "Email": p.get("Email", ""),
        "Website": p.get("Website", ""),
        "Languages": p.get("Languages", ""),
        "Age Groups": p.get("Age Groups", ""),
        "Provider Contact Date": v["Provider Contact Date"],
        "Vacancies": v["Vacancies"],
    })

with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
    fieldnames = [
        "Program Name", "Address", "Neighbourhood",
        "Phone", "Email", "Website",
        "Languages", "Age Groups",
        "Provider Contact Date", "Vacancies",
    ]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"Written {len(rows)} entries to {OUTPUT_FILE}")
