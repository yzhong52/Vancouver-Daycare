# Vancouver Daycare Research

Tools and data for researching child care providers in Vancouver using data from the [Westcoast Child Care Resource Centre (WCCRC)](https://www.wstcoast.org).

---

## Pipeline

Each step feeds into the next. Run them in order to get a fresh map every week.

```
download_childcare_pdfs.py
        │
        ├── data/all_providers_YYYY-MM-DD.pdf
        └── data/Vacancy_List_Updated_-_<Month>_<Year>_-.pdf
        │
        ▼
parse_pdfs.py
        │
        ├── processed_data/providers.csv      (all ~766 registered providers)
        └── processed_data/vacancies.csv      (current week's vacancies)
        │
        ▼
enrich_vacancies.py
        │
        └── processed_data/enriched_vacancies.csv
              (vacancies + matched provider details: address, languages, age groups, etc.)
        │
        ▼
geocode.py
        │
        └── vacancy_map.json
              (geocoded via BC Address Geocoder — free, no API key required)
        │
        ▼
map.html   ← open in browser to view interactive map
```

### Quick start

```bash
python3 -m venv .venv
.venv/bin/pip install requests beautifulsoup4 pdfplumber rapidfuzz

.venv/bin/python download_childcare_pdfs.py
.venv/bin/python parse_pdfs.py
.venv/bin/python enrich_vacancies.py
.venv/bin/python geocode.py

open map.html   # or serve locally: python3 -m http.server
```

---

## Scripts

| Script | Input | Output | Description |
|---|---|---|---|
| `download_childcare_pdfs.py` | wstcoast.org | `data/*.pdf` | Downloads the weekly vacancy list PDF and the all-providers PDF |
| `parse_pdfs.py` | `data/*.pdf` | `processed_data/providers.csv`, `processed_data/vacancies.csv` | Parses both PDFs into CSVs |
| `enrich_vacancies.py` | `processed_data/*.csv` | `processed_data/enriched_vacancies.csv` | Fuzzy-matches each vacancy to its provider record (phone → email → name) |
| `geocode.py` | `processed_data/enriched_vacancies.csv` | `vacancy_map.json` | Geocodes addresses via BC Address Geocoder |
| `map.html` | `vacancy_map.json` | — | Interactive Leaflet map of current vacancies |

---

## Output files

### `processed_data/providers.csv`
Full directory of all ~766 licensed providers registered with WCCRC. Overwritten each run; git tracks changes week-over-week.

| Column | Notes |
|---|---|
| `name` | Program name |
| `location` | Street address |
| `phone` | |
| `email` | |
| `website` | |
| `curriculum` | e.g. Montessori, Play Based, Reggio Inspired |
| `languages` | Semicolon-separated |
| `age_groups` | Semicolon-separated, e.g. `0 - 18 mo; 19 - 36 mo` |
| `schools_served` | Semicolon-separated school names |

### `processed_data/vacancies.csv`
Current week's vacancy list. Overwritten each run; git tracks changes week-over-week.

| Column | Notes |
|---|---|
| `name` | Program name |
| `contact_date` | Date provider was last contacted, e.g. `April 10` |
| `phone_email` | Raw contact string from PDF |
| `neighbourhood` | Vancouver neighbourhood |
| `vacancies` | Description of available spots |

### `processed_data/enriched_vacancies.csv`
Vacancies joined with provider details. The main working dataset.

| Column | Notes |
|---|---|
| `name` | Program name |
| `contact_date` | |
| `neighbourhood` | |
| `vacancies` | |
| `location` | Street address (from providers directory) |
| `phone` | |
| `email` | |
| `website` | |
| `languages` | Semicolon-separated |
| `age_groups` | Semicolon-separated |
| `curriculum` | |
| `match_method` | How the provider was matched: `phone`, `email`, or `name` |
| `match_score` | Fuzzy name score (100 for phone/email matches) |

---

## Notes

- **RLNR providers** (Registered Licensed-Not-Required, max 2 children) are home-based and often not in the provider directory, so they show up as unmatched with no address.
- The BC Address Geocoder (`geocoder.api.gov.bc.ca`) is a free BC government API — no key required.
- PDFs are excluded from git (see `.gitignore`). CSVs under `processed_data/` are tracked so you can diff changes week-over-week.
