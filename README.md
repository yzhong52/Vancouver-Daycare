# Vancouver Daycare Research

Tools and data for researching child care providers in Vancouver using data from the [Westcoast Child Care Resource Centre (WCCRC)](https://www.wstcoast.org).

---

## Files

| File | Description |
|---|---|
| `vacancy_list_<month>_<year>.csv` | Weekly vacancy list extracted from the WCCRC PDF |
| `vacancy_list_<month>_<year>_under12months.csv` | Filtered subset: programs accepting infants under 12 months |
| `child_care_providers.csv` | Full provider directory extracted from the WCCRC search page |
| `parse_providers.py` | Script that generates `child_care_providers.csv` from the saved HTML |
| `RUNBOOK.md` | Step-by-step instructions for repeating the weekly vacancy extraction |

---

## Vacancy List (weekly)

Each week, WCCRC publishes an updated PDF vacancy list. The workflow is:

1. Download the new PDF (filename: `Vacancy_List_Updated_-_<Month>_<Year>_-.pdf`)
2. Ask Claude to extract it following `RUNBOOK.md`
3. Claude produces two CSVs:
   - **`vacancy_list_<month>_<year>.csv`** — all providers with open spots
   - **`vacancy_list_<month>_<year>_under12months.csv`** — filtered for infant programs (under 12 months)

### Columns

| Column | Notes |
|---|---|
| Program Name | |
| Provider Contact Date | Date the provider was last contacted, e.g. "April 10" |
| Telephone/Email | Multiple values joined with ` / ` |
| Neighbourhood | Vancouver neighbourhood |
| Vacancies | Description of available spots |

### Prompt to use next week

> "I downloaded a new vacancy list PDF. Please follow RUNBOOK.md to extract it into CSVs."

### Automated download

`check_vacancy.py` checks the WCCRC search page daily and downloads a new PDF to `data/` whenever the vacancy list is updated (the site updates every Friday).

```bash
# Run manually
.venv/bin/python check_vacancy.py
```

A cron job runs this automatically at 9 AM every day. Logs are written to `logs/check_vacancy.log`.

To set up the cron job on a new machine:

```bash
python3 -m venv .venv
.venv/bin/pip install requests beautifulsoup4
( crontab -l 2>/dev/null; echo "0 9 * * * /path/to/.venv/bin/python /path/to/check_vacancy.py >> /path/to/logs/check_vacancy.log 2>&1" ) | crontab -
```

---

## Provider Directory

`child_care_providers.csv` is a full directory of all licensed child care providers registered with WCCRC in Vancouver. It was extracted from the WCCRC child care search page (saved as an HTML file).

### How it was generated

1. Opened the WCCRC child care search page and saved the full page as HTML
2. Ran `parse_providers.py` against the saved HTML using BeautifulSoup

To regenerate (e.g. after downloading a fresh copy of the search page):

```bash
/opt/homebrew/bin/python3 parse_providers.py
```

> Note: requires `beautifulsoup4`, installed in the Homebrew Python environment.

### Columns

| Column | Notes |
|---|---|
| Program Name | |
| Program Type | e.g. Licensed Family Child Care, Group Daycare (under 36 mths), In-Home Multi-Age Child Care |
| Location | Street address |
| Phone | |
| Email | |
| Website | Full URL if listed |
| Languages | Semicolon-separated |
| Age Groups | Semicolon-separated, e.g. `0 - 18 mo; 19 - 36 mo; 2.5 - 5 yrs` |
| Curriculum | e.g. Montessori, Play Based, Reggio Inspired |
| Schools Served | Semicolon-separated school names |
