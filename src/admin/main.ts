import "./style.css";
import { esc } from "../lib/utils";
import type { Vacancy } from "../lib/types";

let vacancies: Vacancy[] = [];
let editingId: string | null = null;

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function showStatus(msg: string, type: "ok" | "err" | "info" = "info"): void {
  const el = document.getElementById("status-msg")!;
  el.textContent = msg;
  el.className = `status-msg ${type}`;
  el.style.display = msg ? "" : "none";
  if (msg && type === "ok") {
    setTimeout(() => { if (el.textContent === msg) el.style.display = "none"; }, 4000);
  }
}

function updateCount(): void {
  const n = vacancies.length;
  document.getElementById("vacancy-count")!.textContent =
    `${n} manual vacanc${n !== 1 ? "ies" : "y"}`;
}

// ─── Settings ────────────────────────────────────────────────────────────────

const LS_KEYS = { owner: "gh_owner", repo: "gh_repo", path: "gh_path", token: "gh_token" } as const;

function loadSettings(): void {
  (document.getElementById("s-owner") as HTMLInputElement).value = localStorage.getItem(LS_KEYS.owner) ?? "yzhong52";
  (document.getElementById("s-repo")  as HTMLInputElement).value = localStorage.getItem(LS_KEYS.repo)  ?? "Vancouver-Daycare";
  (document.getElementById("s-path")  as HTMLInputElement).value = localStorage.getItem(LS_KEYS.path)  ?? "processed_data/additional_vacancies.json";
  (document.getElementById("s-token") as HTMLInputElement).value = localStorage.getItem(LS_KEYS.token) ?? "";
}

function saveSettingsToStorage(): void {
  localStorage.setItem(LS_KEYS.owner, (document.getElementById("s-owner") as HTMLInputElement).value.trim());
  localStorage.setItem(LS_KEYS.repo,  (document.getElementById("s-repo")  as HTMLInputElement).value.trim());
  localStorage.setItem(LS_KEYS.path,  (document.getElementById("s-path")  as HTMLInputElement).value.trim());
  localStorage.setItem(LS_KEYS.token, (document.getElementById("s-token") as HTMLInputElement).value.trim());
  const statusEl = document.getElementById("settings-status")!;
  statusEl.textContent = "Saved!";
  setTimeout(() => { statusEl.textContent = ""; }, 2500);
}

function getSettings() {
  return {
    owner: localStorage.getItem(LS_KEYS.owner) ?? "yzhong52",
    repo:  localStorage.getItem(LS_KEYS.repo)  ?? "Vancouver-Daycare",
    path:  localStorage.getItem(LS_KEYS.path)  ?? "processed_data/additional_vacancies.json",
    token: localStorage.getItem(LS_KEYS.token) ?? "",
  };
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadVacancies(): Promise<void> {
  try {
    // Cache-bust so edits saved to GitHub are immediately visible on reload.
    const r = await fetch("processed_data/additional_vacancies.json?_=" + Date.now());
    vacancies = r.ok ? await r.json() : [];
  } catch {
    vacancies = [];
  }
  renderTable();
  updateCount();
}

// ─── Table ────────────────────────────────────────────────────────────────────

function renderTable(): void {
  const tbody = document.getElementById("vacancies-body")!;
  if (vacancies.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="icon">📋</div>
          <p>No manual vacancies yet. Click <strong>+ Add Vacancy</strong> to get started.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = vacancies.map((v) => `
    <tr>
      <td class="cell-name">${esc(v.name)}</td>
      <td>${esc(v.neighbourhood) || '<span class="form-hint">—</span>'}</td>
      <td>${v.age_groups ? `<span class="tag">${esc(v.age_groups)}</span>` : '<span class="form-hint">—</span>'}</td>
      <td>${esc(v.contact_date) || '<span class="form-hint">—</span>'}</td>
      <td class="cell-vacancy"><p>${esc(v.vacancies)}</p></td>
      <td style="text-align:center">${(v.lat && v.lng) ? '<span class="dot-yes" title="Has coordinates">✓</span>' : '<span class="dot-no" title="No coordinates">○</span>'}</td>
      <td class="action-cell">
        <div style="display:flex;gap:6px;justify-content:flex-end;">
          <button class="btn btn-ghost btn-sm" data-edit="${esc(v.id)}">Edit</button>
          <button class="btn btn-danger btn-sm" data-delete="${esc(v.id)}">Delete</button>
        </div>
      </td>
    </tr>`).join("");
}

function handleTableClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const editId = target.dataset.edit;
  const deleteId = target.dataset.delete;

  if (editId) {
    openModal(editId);
  } else if (deleteId) {
    if (target.dataset.confirming) {
      deleteVacancy(deleteId);
    } else {
      target.dataset.confirming = "1";
      target.textContent = "Confirm?";
      setTimeout(() => {
        delete target.dataset.confirming;
        target.textContent = "Delete";
      }, 3000);
    }
  }
}

function deleteVacancy(id: string): void {
  vacancies = vacancies.filter((v) => v.id !== id);
  renderTable();
  updateCount();
  showStatus("Deleted — remember to save.", "info");
}

// ─── Modal ───────────────────────────────────��────────────────────────────────

function openModal(id: string | null = null): void {
  editingId = id;
  document.getElementById("modal-title")!.textContent = id ? "Edit Vacancy" : "Add Vacancy";
  clearForm();
  if (id) {
    const v = vacancies.find((x) => x.id === id);
    if (v) vacancyToForm(v);
  }
  document.getElementById("modal-overlay")!.classList.remove("hidden");
  (document.getElementById("f-name") as HTMLInputElement).focus();
}

function closeModal(): void {
  document.getElementById("modal-overlay")!.classList.add("hidden");
  editingId = null;
}

function clearForm(): void {
  ["name","address","neighbourhood","contact-date","phone","email","website",
   "languages","age-groups","curriculum","vacancies","notes","lat","lng"].forEach((f) => {
    const el = document.getElementById("f-" + f) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el) el.value = "";
  });
  document.getElementById("geocode-status")!.textContent = "";
}

function vacancyToForm(v: Vacancy): void {
  (document.getElementById("f-name")         as HTMLInputElement).value = v.name;
  (document.getElementById("f-address")      as HTMLInputElement).value = v.address;
  (document.getElementById("f-neighbourhood")as HTMLInputElement).value = v.neighbourhood;
  (document.getElementById("f-contact-date") as HTMLInputElement).value = v.contact_date;
  (document.getElementById("f-phone")        as HTMLInputElement).value = v.phone;
  (document.getElementById("f-email")        as HTMLInputElement).value = v.email;
  (document.getElementById("f-website")      as HTMLInputElement).value = v.website;
  (document.getElementById("f-languages")    as HTMLInputElement).value = v.languages;
  (document.getElementById("f-age-groups")   as HTMLInputElement).value = v.age_groups;
  (document.getElementById("f-curriculum")   as HTMLInputElement).value = v.curriculum;
  (document.getElementById("f-vacancies")    as HTMLTextAreaElement).value = v.vacancies;
  (document.getElementById("f-notes")        as HTMLTextAreaElement).value = v.notes ?? "";
  (document.getElementById("f-lat")          as HTMLInputElement).value = String(v.lat ?? "");
  (document.getElementById("f-lng")          as HTMLInputElement).value = String(v.lng ?? "");
}

function formToVacancy(): Vacancy {
  const g = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value.trim();
  const lat = parseFloat(g("f-lat"));
  const lng = parseFloat(g("f-lng"));
  return {
    id:           editingId ?? uid(),
    name:         g("f-name"),
    address:      g("f-address"),
    neighbourhood:g("f-neighbourhood"),
    contact_date: g("f-contact-date"),
    phone:        g("f-phone"),
    email:        g("f-email"),
    website:      g("f-website"),
    languages:    g("f-languages"),
    age_groups:   g("f-age-groups"),
    curriculum:   g("f-curriculum"),
    vacancies:    g("f-vacancies"),
    notes:        g("f-notes"),
    lat:          isNaN(lat) ? null : lat,
    lng:          isNaN(lng) ? null : lng,
  };
}

function saveVacancy(): void {
  const name = (document.getElementById("f-name") as HTMLInputElement).value.trim();
  const vac  = (document.getElementById("f-vacancies") as HTMLTextAreaElement).value.trim();
  if (!name || !vac) {
    alert("Provider Name and Vacancy Description are required.");
    return;
  }
  const v = formToVacancy();
  if (editingId) {
    const idx = vacancies.findIndex((x) => x.id === editingId);
    if (idx >= 0) vacancies[idx] = v;
  } else {
    vacancies.push(v);
  }
  closeModal();
  renderTable();
  updateCount();
  showStatus("Saved locally — remember to push to GitHub.", "info");
}

// ─── Geocoding ────────────────────────────────────────────────────────────────

async function geocodeAddress(): Promise<void> {
  const addr = (document.getElementById("f-address") as HTMLInputElement).value.trim();
  if (!addr) { alert("Enter an address first."); return; }

  const btn = document.getElementById("geocode-btn") as HTMLButtonElement;
  const statusEl = document.getElementById("geocode-status")!;
  btn.disabled = true;
  btn.textContent = "…";
  statusEl.textContent = "Geocoding…";

  try {
    // Append city context if not already present, matching the Python pipeline's behavior.
    const fullAddr = /vancouver/i.test(addr) ? addr : addr + ", Vancouver, BC";
    const url = "https://geocoder.api.gov.bc.ca/addresses.json?addressString="
      + encodeURIComponent(fullAddr) + "&maxResults=1";
    const r = await fetch(url);
    if (!r.ok) throw new Error("Geocoder returned " + r.status);
    const data = await r.json();
    const feat = data.features?.[0];
    if (!feat) throw new Error("No results found for this address.");

    const [lng, lat] = feat.geometry.coordinates as [number, number];
    const score: unknown = feat.properties?.score ?? "?";
    (document.getElementById("f-lat") as HTMLInputElement).value = String(lat);
    (document.getElementById("f-lng") as HTMLInputElement).value = String(lng);
    statusEl.textContent = `✓ Found (score: ${score}) — verify on the map before saving`;
  } catch (err) {
    statusEl.textContent = "Error: " + (err as Error).message;
  } finally {
    btn.disabled = false;
    btn.textContent = "📍 Geocode";
  }
}

// ─── Export / Save ────────────────────────────────────────────────────────────

function downloadJSON(): void {
  const blob = new Blob([JSON.stringify(vacancies, null, 2) + "\n"], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "additional_vacancies.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

// Encodes a UTF-8 string to base64 without using the deprecated `unescape` function.
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
}

async function saveToGitHub(): Promise<void> {
  const { owner, repo, path, token } = getSettings();
  if (!token) { showStatus("No GitHub token — open Settings to configure it.", "err"); return; }
  if (!owner || !repo || !path) { showStatus("Configure owner, repo, and path in Settings.", "err"); return; }

  const btn = document.getElementById("save-gh-btn") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Saving…";
  showStatus("Saving to GitHub…", "info");

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  try {
    // Fetch the current file's SHA; required by the GitHub API to update an existing file.
    let sha: string | null = null;
    const getResp = await fetch(apiBase, { headers });
    if (getResp.ok) {
      const meta = await getResp.json() as { sha: string };
      sha = meta.sha;
    } else if (getResp.status !== 404) {
      throw new Error(`GitHub GET failed: ${getResp.status} ${getResp.statusText}`);
    }

    const content = toBase64(JSON.stringify(vacancies, null, 2) + "\n");
    const body = {
      message: `Update vacancies.json (${vacancies.length} entries)`,
      content,
      ...(sha ? { sha } : {}),
    };

    const putResp = await fetch(apiBase, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!putResp.ok) {
      const err = await putResp.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? `${putResp.status} ${putResp.statusText}`);
    }

    showStatus(`Saved to ${owner}/${repo} — changes will appear on the site after GitHub Pages rebuilds.`, "ok");
  } catch (err) {
    showStatus("Save failed: " + (err as Error).message, "err");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save to GitHub";
  }
}

// ─── Wire up events ───────────────────────────────────────────────────────────

document.getElementById("settings-toggle-btn")!.addEventListener("click", () => {
  const panel = document.getElementById("settings-panel")!;
  panel.style.display = panel.style.display === "none" ? "" : "none";
});

document.getElementById("save-settings-btn")!.addEventListener("click", saveSettingsToStorage);
document.getElementById("add-btn")!.addEventListener("click", () => openModal(null));
document.getElementById("modal-close")!.addEventListener("click", closeModal);
document.getElementById("cancel-btn")!.addEventListener("click", closeModal);
document.getElementById("save-vacancy-btn")!.addEventListener("click", saveVacancy);
document.getElementById("geocode-btn")!.addEventListener("click", geocodeAddress);
document.getElementById("download-btn")!.addEventListener("click", downloadJSON);
document.getElementById("save-gh-btn")!.addEventListener("click", saveToGitHub);
document.getElementById("vacancies-body")!.addEventListener("click", handleTableClick);

document.getElementById("modal-overlay")!.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ─── Init ─────────────────────────────────────────────────────────────────────

loadSettings();
loadVacancies();
