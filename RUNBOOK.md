# Vancouver Daycare Vacancy List — Weekly CSV Extraction Runbook

The user receives a weekly updated PDF from Westcoast Child Care Resource Centre (WCCRC) and wants two CSV files extracted from it.

---

## Steps

### 1. Read the PDF
- The PDF is located in `/Users/yuchen/Projects/Vancouver-Daycare/`
- Filename pattern: `Vacancy_List_Updated_-_<Month>_<Year>_-.pdf`
- Read all pages — entries span across multiple pages, two rows per page

### 2. Extract all rows into the main CSV
- Output file: `vacancy_list_<month>_<year>.csv` (e.g. `vacancy_list_april_2026.csv`)
- Columns (in order):
  1. `Program Name`
  2. `Provider Contact Date`
  3. `Telephone/Email`
  4. `Neighbourhood`
  5. `Vacancies`
- Quote any field that contains commas
- Multiple phone numbers or emails: join with ` / `
- Multi-line vacancy details: join with `; `

### 3. Filter rows accepting children under 12 months into a second CSV
- Output file: `vacancy_list_<month>_<year>_under12months.csv`
- Same columns as the main CSV
- Include a row if the vacancy description matches ANY of these criteria:
  - Explicitly starts at an age under 12 months (e.g. "6 months", "8 months")
  - Uses the word "infant" (infants = under 12 months)
  - States a range with no lower bound that could include infants (e.g. "under 36 months", "under 3 years old")
  - Has an "infant room" mentioned

---

## Notes
- The PDF header/footer text (disclaimer, LIC/RLNR definitions, WCCRC branding) is not part of the table — skip it
- Dates in the "Provider Contact Date" column are relative to the update month — keep them as-is (e.g. "April 10", "March 27")
- "Neighbourhood" sometimes appears concatenated in the PDF (e.g. "DunbarSouthlands") — correct to "Dunbar-Southlands", "Renfrew-Collingwood", etc.
