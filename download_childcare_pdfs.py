#!/usr/bin/env python3
"""
Download Vancouver Child Care PDFs from wstcoast.org:
  - Vacancy list (static PDF linked on the page, updated weekly)
  - All-providers list (generated via the Printable PDF endpoint with no filters)
"""

import re
import sys
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

SEARCH_PAGE = "https://www.wstcoast.org/choosing-child-care/search"
PDF_ENDPOINT = "https://www.wstcoast.org/choosing-child-care/search/pdf/1609"
DATA_DIR = Path(__file__).parent / "data"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


def fetch_search_page(session: requests.Session) -> requests.Response:
    resp = session.get(SEARCH_PAGE, timeout=30)
    resp.raise_for_status()
    return resp


def download_vacancy_list(session: requests.Session, page: requests.Response) -> None:
    """Download the weekly vacancy list PDF (static file linked on the page)."""
    soup = BeautifulSoup(page.text, "html.parser")
    tag = soup.find("a", href=re.compile(r"Vacancy_List", re.I))
    if not tag:
        raise RuntimeError("Vacancy list link not found on page")

    url = tag["href"]
    dest = DATA_DIR / url.split("/")[-1]
    if dest.exists():
        print(f"Vacancy list already up to date: {dest.name}")
        return

    print(f"Downloading vacancy list: {dest.name}")
    resp = session.get(url, timeout=60)
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    print(f"Saved: {dest} ({len(resp.content) // 1024} KB)")


def download_all_providers(session: requests.Session, page: requests.Response) -> None:
    """Download all providers as a printable PDF (no search filters applied)."""
    match = re.search(r'CCM_SECURITY_TOKEN\s*=\s*["\']([^"\']+)["\']', page.text)
    if not match:
        match = re.search(r'name=["\']ccm_token["\']\s+value=["\']([^"\']+)["\']', page.text)
    if not match:
        raise RuntimeError(
            "Could not extract ccm_token — inspect the Printable PDF request in DevTools."
        )

    token = match.group(1)
    today = date.today().strftime("%Y-%m-%d")
    dest = DATA_DIR / f"all_providers_{today}.pdf"

    if dest.exists():
        print(f"All-providers PDF already downloaded: {dest.name}")
        return

    print(f"Downloading all-providers PDF...")
    resp = session.get(
        PDF_ENDPOINT,
        params={
            "ccm_token": token,
            "language": "0",
            "curriculum": "All",
            "postalCode": "",
            "distance": "0",
            "schools": "0",
            "keyword": "",
            "resultFormat": "Printable PDF",
        },
        timeout=60,
        stream=True,
    )
    resp.raise_for_status()

    content_type = resp.headers.get("Content-Type", "")
    if "pdf" not in content_type:
        raise RuntimeError(f"Unexpected Content-Type '{content_type}' — token may be invalid.")

    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"Saved: {dest}")


def main() -> None:
    DATA_DIR.mkdir(exist_ok=True)

    with requests.Session() as session:
        session.headers["User-Agent"] = USER_AGENT
        try:
            page = fetch_search_page(session)
            download_vacancy_list(session, page)
            download_all_providers(session, page)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
