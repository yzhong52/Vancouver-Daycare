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
  notes?: string;
}

export interface MapEntry {
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
  lat: string | number;
  lng: string | number;
  _source: "auto" | "manual";
}
