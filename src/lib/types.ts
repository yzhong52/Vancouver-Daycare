// Vacancy mirrors the JSON schema of additional_vacancies.json.
// Field names match CSV column names produced by the Python pipeline.
export interface Vacancy {
  id: string;
  name: string;
  address: string;
  neighbourhood: string;
  phone: string;
  email: string;
  website: string;
  languages: string;
  age_groups: string;
  curriculum: string;
  contact_date: string;
  vacancies: string;
  lat: number | null;
  lng: number | null;
  notes?: string;  // admin-only; not shown on the map
}

// MapEntry is the display record passed to the map renderer.
// It drops admin-only fields (id, notes) and tags the data source.
export type MapEntry = Omit<Vacancy, "id" | "notes"> & {
  _source: "auto" | "manual";
};
