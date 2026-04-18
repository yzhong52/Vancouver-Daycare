#!/usr/bin/env python3
"""
Parse downloaded childcare PDFs into CSVs:
  data/all_providers_*.pdf  → processed_data/providers.csv
  data/Vacancy_List_*.pdf   → processed_data/vacancies.csv
"""

import csv
import logging
import re
import sys
from pathlib import Path

import pdfplumber

_ROOT = Path(__file__).parent
DATA_DIR = _ROOT / "data"
OUT_DIR = _ROOT / "processed_data"
LOG_FILE = _ROOT / "logs" / "parse_pdfs.log"

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

# Field labels as they appear in the providers PDF
LEFT_LABELS = ["Location", "Phone", "Email", "Website"]
RIGHT_LABELS = ["Curriculum", "Languages", "Age Groups", "Schools Served"]
ALL_LABELS = LEFT_LABELS + RIGHT_LABELS

# Sort longest-first so multi-word labels ("Age Groups") match before shorter ones
_LABEL_PATTERN = "|".join(re.escape(l) for l in sorted(ALL_LABELS, key=len, reverse=True))
LABEL_RE = re.compile(rf"({_LABEL_PATTERN}):\s*")


def parse_block(block: str) -> dict:
    """Parse the fields section of one provider entry using a line-by-line approach
    that handles the PDF's two-column layout."""
    fields: dict[str, list[str]] = {l: [] for l in ALL_LABELS}
    current_right: str | None = None

    for line in block.strip().splitlines():
        line = line.strip()
        if not line:
            continue

        matches = list(LABEL_RE.finditer(line))

        if not matches:
            # Orphan line — continuation of the active right-column field
            if current_right:
                fields[current_right].append(line)
            continue

        pos = 0
        for idx, m in enumerate(matches):
            # Text before this label is a right-column continuation
            pre = line[pos : m.start()].strip()
            if pre and current_right:
                fields[current_right].append(pre)

            label = m.group(1)
            next_start = matches[idx + 1].start() if idx + 1 < len(matches) else len(line)
            raw_value = line[m.end() : next_start].strip()
            pos = next_start

            if label == "Email":
                email_m = re.match(r"\S+@\S+", raw_value)
                if email_m:
                    fields["Email"].append(email_m.group(0))
                    rest = raw_value[email_m.end() :].strip()
                    if rest and current_right:
                        fields[current_right].append(rest)
                else:
                    fields["Email"].append(raw_value)

            elif label == "Website":
                url_m = re.match(r"\S+", raw_value)
                if url_m:
                    fields["Website"].append(url_m.group(0))
                    rest = raw_value[url_m.end() :].strip()
                    if rest and current_right:
                        fields[current_right].append(rest)
                else:
                    fields["Website"].append(raw_value)

            elif label == "Phone":
                phone_m = re.match(r"[\d\-()+.]+", raw_value)
                if phone_m:
                    fields["Phone"].append(phone_m.group(0))
                    rest = raw_value[phone_m.end() :].strip()
                    if rest and current_right:
                        fields[current_right].append(rest)
                else:
                    fields["Phone"].append(raw_value)

            elif label in RIGHT_LABELS:
                current_right = label
                if raw_value:
                    fields[label].append(raw_value)

            else:
                # Location
                fields[label].append(raw_value)

    return {
        "location": " ".join(fields["Location"]),
        "phone": " ".join(fields["Phone"]),
        "email": " ".join(fields["Email"]),
        "website": " ".join(fields["Website"]),
        "curriculum": " ".join(fields["Curriculum"]),
        "languages": "; ".join(fields["Languages"]),
        "age_groups": "; ".join(fields["Age Groups"]),
        "schools_served": "; ".join(fields["Schools Served"]),
    }


def parse_providers(pdf_path: Path) -> list[dict]:
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            text = re.sub(r"^Child Care Search Results\n", "", text)
            text = re.sub(r"\n\d+$", "", text)
            pages.append(text)
    full_text = "\n".join(pages)

    # Each entry: single-line name → "Contact Details:" → fields block
    # Lookahead stops fields before the next entry's name+header
    entries = re.findall(
        r"([^\n]+)\nContact Details:\n(.*?)(?=\n[^\n]+\nContact Details:|\Z)",
        full_text,
        re.DOTALL,
    )

    rows = []
    for name, block in entries:
        row = {"name": name.strip()}
        row.update(parse_block(block))
        rows.append(row)

    return rows


def parse_vacancies(pdf_path: Path) -> list[dict]:
    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for row in table:
                    if not row or not row[0]:
                        continue
                    cells = [" ".join((c or "").split()) for c in row]
                    # Skip the header row
                    if cells[0] == "Program Name":
                        continue
                    if len(cells) < 5:
                        continue
                    rows.append({
                        "name": cells[0],
                        "contact_date": cells[1],
                        "phone_email": cells[2],
                        "neighbourhood": cells[3],
                        "vacancies": cells[4],
                    })
    return rows


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    path.parent.mkdir(exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    log.info(f"Wrote {len(rows)} rows → {path}")


def latest(pattern: str) -> Path:
    matches = sorted(DATA_DIR.glob(pattern))
    if not matches:
        raise FileNotFoundError(
            f"No file matching data/{pattern}. Run download_childcare_pdfs.py first."
        )
    return matches[-1]


def main() -> None:
    try:
        providers_pdf = latest("all_providers_*.pdf")
        vacancies_pdf = latest("Vacancy_List_*.pdf")
    except FileNotFoundError as e:
        log.error(e)
        sys.exit(1)

    log.info(f"Parsing providers: {providers_pdf.name}")
    providers = parse_providers(providers_pdf)
    write_csv(
        OUT_DIR / "providers.csv",
        providers,
        ["name", "location", "phone", "email", "website",
         "curriculum", "languages", "age_groups", "schools_served"],
    )

    log.info(f"Parsing vacancies: {vacancies_pdf.name}")
    vacancies = parse_vacancies(vacancies_pdf)
    write_csv(
        OUT_DIR / "vacancies.csv",
        vacancies,
        ["name", "contact_date", "phone_email", "neighbourhood", "vacancies"],
    )


if __name__ == "__main__":
    main()
