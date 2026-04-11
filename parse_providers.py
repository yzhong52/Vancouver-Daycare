from bs4 import BeautifulSoup
import csv

html_file = "Child Care Search - Westcoast Child Care Resource Centre.html"

with open(html_file, encoding="utf-8") as f:
    soup = BeautifulSoup(f, "html.parser")

rows = []
for row in soup.select("div.provider-result-row"):
    # Program Name and Type
    name_div = row.select_one(".name")
    program_name = name_div.select_one("strong").get_text(strip=True) if name_div else ""
    name_paras = name_div.find_all("p") if name_div else []
    program_type = name_paras[1].get_text(strip=True) if len(name_paras) > 1 else ""

    # Location
    loc_div = row.select_one(".location")
    location = loc_div.get_text(strip=True) if loc_div else ""

    # Contact: phone, email, website
    contact_div = row.select_one(".contact")
    phone = ""
    email = ""
    website = ""
    if contact_div:
        for p in contact_div.find_all("p"):
            a = p.find("a")
            text = p.get_text(strip=True)
            if a:
                href = a.get("href", "")
                if href.startswith("mailto:"):
                    email = href[len("mailto:"):]
                elif text == "Website" or href.startswith("http"):
                    website = href
            elif text:
                phone = text

    # Curriculum
    curr_div = row.select_one(".curriculum")
    curriculum = curr_div.get_text(strip=True) if curr_div else ""

    # Languages
    lang_div = row.select_one(".languages")
    languages = "; ".join(
        p.get_text(strip=True) for p in lang_div.find_all("p") if p.get_text(strip=True)
    ) if lang_div else ""

    # Age Groups
    age_div = row.select_one(".age-groups")
    age_groups = "; ".join(
        p.get_text(strip=True) for p in age_div.find_all("p") if p.get_text(strip=True)
    ) if age_div else ""

    # Schools Served
    schools_div = row.select_one(".schools-served")
    schools = "; ".join(
        p.get_text(strip=True) for p in schools_div.find_all("p") if p.get_text(strip=True)
    ) if schools_div else ""

    rows.append([
        program_name, program_type, location,
        phone, email, website,
        languages, age_groups, curriculum, schools,
    ])

with open("child_care_providers.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow([
        "Program Name", "Program Type", "Location",
        "Phone", "Email", "Website",
        "Languages", "Age Groups", "Curriculum", "Schools Served",
    ])
    writer.writerows(rows)

print(f"Written {len(rows)} entries to child_care_providers.csv")
