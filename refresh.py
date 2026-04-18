#!/usr/bin/env python3
"""
Full data refresh pipeline. Run this to update all processed data from source.

Steps:
  1. download_childcare_pdfs  — fetch latest PDFs from wstcoast.org
  2. parse_pdfs               — extract providers + vacancies into CSVs
  3. enrich_vacancies         — fuzzy-match vacancies with provider details
  4. geocode_vacancies        — geocode addresses via BC Address Geocoder

Usage:
    python refresh.py
"""

import subprocess
import sys
from pathlib import Path

SCRIPTS = [
    "download_childcare_pdfs.py",
    "parse_pdfs.py",
    "enrich_vacancies.py",
    "geocode_vacancies.py",
]


def main() -> None:
    root = Path(__file__).parent
    python = sys.executable

    for script in SCRIPTS:
        print(f"\n{'='*50}")
        print(f"Running: {script}")
        print('='*50)
        result = subprocess.run([python, root / script], cwd=root)
        if result.returncode != 0:
            print(f"\nError: {script} failed (exit {result.returncode})", file=sys.stderr)
            sys.exit(result.returncode)

    print("\nRefresh complete.")


if __name__ == "__main__":
    main()
