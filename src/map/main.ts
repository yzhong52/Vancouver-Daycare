import "leaflet/dist/leaflet.css";
import "./style.css";
import L from "leaflet";
import { esc, safeHref, parseCSV } from "../lib/utils";
import { ageInMonths, formatAge, providerMatchesAge } from "../lib/age";
import type { MapEntry, Vacancy } from "../lib/types";

const mapEl = document.getElementById("map")!;
const birthdayEl = document.getElementById("birthday") as HTMLInputElement;
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;
const ageLabelEl = document.getElementById("age-label")!;
const countEl = document.getElementById("count")!;

const map = L.map("map").setView([49.245, -123.13], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

birthdayEl.max = new Date().toISOString().split("T")[0];

function buildPopup(p: MapEntry): string {
  const details: [string, string][] = [
    p.age_groups ? ["Age groups", esc(p.age_groups)] : null,
    p.languages  ? ["Languages",  esc(p.languages)]  : null,
    p.curriculum ? ["Curriculum", esc(p.curriculum)] : null,
    ["Address", esc(p.address)],
    p.phone   ? ["Phone",   `<a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>`] : null,
    p.email   ? ["Email",   `<a class="truncate" href="mailto:${esc(p.email)}" title="${esc(p.email)}">${esc(p.email)}</a>`] : null,
    p.website ? ["Website", `<a href="${esc(safeHref(p.website))}" target="_blank" rel="noopener">Visit ↗</a>`] : null,
  ].filter((x): x is [string, string] => x !== null);

  return `
    <div class="popup">
      <h3>${esc(p.name)}</h3>
      <div class="neighbourhood">${esc(p.neighbourhood)}</div>
      <div class="vacancy-box">
        <strong>Vacancy</strong>
        ${esc(p.vacancies)}
      </div>
      <table>${details.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>
      <span class="date-tag">Updated: ${esc(p.contact_date)}</span>
    </div>`;
}

let overlayEl: HTMLElement | null = null;
function setOverlay(html: string | null): void {
  overlayEl?.remove();
  if (!html) { overlayEl = null; return; }
  overlayEl = document.createElement("div");
  overlayEl.className = "map-overlay";
  overlayEl.innerHTML = html;
  mapEl.appendChild(overlayEl);
}

function makePinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="38" viewBox="0 0 24 38">
      <path fill="${color}" stroke="rgba(0,0,0,0.25)" stroke-width="1" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 26 12 26S24 21 24 12C24 5.4 18.6 0 12 0z"/>
      <circle fill="rgba(255,255,255,0.9)" cx="12" cy="12" r="4.5"/>
    </svg>`,
    iconSize: [24, 38],
    iconAnchor: [12, 38],
    popupAnchor: [0, -38],
  });
}

const iconAuto   = makePinIcon("#2c5f8a");
const iconManual = makePinIcon("#d96c00");

const markerLayer = L.layerGroup().addTo(map);
let allData: MapEntry[] = [];
let initialBoundsFit = false;

function renderMarkers(data: MapEntry[]): void {
  markerLayer.clearLayers();

  const mappable = data
    .filter((p) => p.lat && p.lng)
    .map((p) => ({ p, lat: parseFloat(String(p.lat)), lng: parseFloat(String(p.lng)) }));

  if (data.length === 0) {
    setOverlay("<strong>No matches</strong>No daycares match this age group.");
  } else if (mappable.length === 0) {
    setOverlay("<strong>No map locations</strong>Matching providers found but none have known addresses.");
  } else {
    setOverlay(null);
  }

  mappable.forEach(({ p, lat, lng }) => {
    const icon = p._source === "manual" ? iconManual : iconAuto;
    L.marker([lat, lng], { icon })
      .bindPopup(buildPopup(p), { maxWidth: 320 })
      .addTo(markerLayer);
  });

  countEl.textContent = `${data.length} provider${data.length !== 1 ? "s" : ""}`;

  if (mappable.length && !initialBoundsFit) {
    map.fitBounds(mappable.map(({ lat, lng }) => [lat, lng] as [number, number]), { padding: [40, 40] });
    initialBoundsFit = true;
  }
}

function applyFilter(): void {
  const val = birthdayEl.value;
  if (!val) {
    ageLabelEl.style.display = "none";
    clearBtn.style.display = "none";
    setOverlay("<strong>Enter your child's birthday</strong>Use the picker above to find matching daycares.");
    countEl.textContent = `${allData.length} provider${allData.length !== 1 ? "s" : ""}`;
    markerLayer.clearLayers();
    initialBoundsFit = false;
    renderMarkers(allData);
    return;
  }

  const months = ageInMonths(val);
  ageLabelEl.textContent = formatAge(months);
  ageLabelEl.style.display = "";
  clearBtn.style.display = "";

  const filtered = allData.filter((p) => p.age_groups && providerMatchesAge(p.age_groups, months));
  renderMarkers(filtered);
}

birthdayEl.addEventListener("change", applyFilter);

clearBtn.addEventListener("click", () => {
  birthdayEl.value = "";
  initialBoundsFit = false;
  applyFilter();
});

setOverlay("Loading…");

Promise.all([
  fetch("processed_data/geocoded_vacancies.csv")
    .then((r) => {
      if (!r.ok) throw new Error("processed_data/geocoded_vacancies.csv not found — run geocode_vacancies.py first.");
      return r.text();
    })
    .then((text) => parseCSV(text).map((p): MapEntry => ({ ...(p as Omit<MapEntry, "_source">), _source: "auto" }))),

  fetch("processed_data/additional_vacancies.json?_=" + Date.now())
    .then((r) => (r.ok ? r.json() : []))
    .then((items: Vacancy[]) =>
      items
        .filter((v) => v.lat && v.lng)
        .map((v): MapEntry => ({
          name:          v.name ?? "",
          address:       v.address ?? "",
          neighbourhood: v.neighbourhood ?? "",
          phone:         v.phone ?? "",
          email:         v.email ?? "",
          website:       v.website ?? "",
          languages:     v.languages ?? "",
          age_groups:    v.age_groups ?? "",
          curriculum:    v.curriculum ?? "",
          contact_date:  v.contact_date ?? "",
          vacancies:     v.vacancies ?? "",
          lat:           v.lat!,
          lng:           v.lng!,
          _source:       "manual",
        }))
    )
    .catch(() => [] as MapEntry[]),
])
  .then(([autoData, manualData]) => {
    allData = [...autoData, ...manualData];
    applyFilter();
  })
  .catch((err: Error) => {
    setOverlay(`<strong>Error</strong>${esc(err.message)}`);
  });
