import {
  ensureAdminBanner,
  formatDate,
  openJsonModal,
  requireSession,
  apiFetch,
  setActiveSidebar,
  showToast,
} from "./adminBase.js";

setActiveSidebar("adminofertas.html");

const els = {
  tbody: document.getElementById("jobsTbody"),
  search: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  contractFilter: document.getElementById("contractFilter"),
  statTotal: document.getElementById("statTotal"),
  statPending: document.getElementById("statPending"),
  statActive: document.getElementById("statActive"),
  statRejected: document.getElementById("statRejected"),
};

let allJobs = [];

function normalizeStatus(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("pend")) return "pendiente";
  if (v.includes("inact") || v.includes("desact")) return "inactivo";
  if (v.includes("activ") || v.includes("aprob") || v.includes("accept") || v.includes("ok"))
    return "activo";
  if (v.includes("rech") || v.includes("deny") || v.includes("reject"))
    return "rechazada";
  return v || "pendiente";
}

function prettyStatus(status) {
  const v = normalizeStatus(status);
  return v === "activo"
    ? "Activo"
    : v === "inactivo"
      ? "Inactiva"
    : v === "rechazada"
      ? "Rechazada"
      : "Pendiente";
}

function statusBadgeClass(status) {
  const v = normalizeStatus(status);
  return v === "activo"
    ? "text-bg-success"
    : v === "inactivo"
      ? "text-bg-secondary"
    : v === "rechazada"
      ? "text-bg-danger"
      : "text-bg-warning";
}

async function loadJobs() {
  try {
    const result = await apiFetch("/api/admin/jobs");
    allJobs = result?.jobs || [];
  } catch (e) {
    showToast("No se pudieron cargar ofertas: " + e.message, "danger");
    allJobs = [];
  }
}

function computeStats(jobs) {
  els.statTotal.textContent = jobs.length;
  els.statPending.textContent = jobs.filter(
    (j) => normalizeStatus(j.status) === "pendiente",
  ).length;
  els.statActive.textContent = jobs.filter(
    (j) => normalizeStatus(j.status) === "activo",
  ).length;
  els.statRejected.textContent = jobs.filter(
    (j) => normalizeStatus(j.status) === "rechazada",
  ).length;
}

function applyFilters(jobs) {
  const q = (els.search.value || "").trim().toLowerCase();
  const status = (els.statusFilter.value || "").trim().toLowerCase();
  const contract = (els.contractFilter.value || "").trim().toLowerCase();

  return jobs.filter((j) => {
    const matchesQ =
      !q ||
      String(j.title || "")
        .toLowerCase()
        .includes(q) ||
      String(j.location || "")
        .toLowerCase()
        .includes(q) ||
      String(j.contract_type || "")
        .toLowerCase()
        .includes(q);

    const matchesStatus = !status || normalizeStatus(j.status) === status;
    const matchesContract =
      !contract || String(j.contract_type || "").toLowerCase() === contract;
    return matchesQ && matchesStatus && matchesContract;
  });
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render(jobs) {
  if (!els.tbody) return;
  if (!jobs.length) {
    els.tbody.innerHTML = `<tr><td colspan="6" class="text-muted">No hay resultados.</td></tr>`;
    return;
  }

  els.tbody.innerHTML = jobs
    .map((j) => {
      const st = prettyStatus(j.status);
      const stCls = statusBadgeClass(j.status);
      const date = formatDate(j.created_at);
      const contract = j.contract_type ? String(j.contract_type) : "-";

      const showModeration = normalizeStatus(j.status) === "pendiente";

      return `
        <tr>
          <td class="fw-semibold">${escapeHtml(j.title || "Sin título")}</td>
          <td class="text-muted">${escapeHtml(j.location || "-")}</td>
          <td class="text-muted">${escapeHtml(contract)}</td>
          <td><span class="badge rounded-pill ${stCls}">${escapeHtml(st)}</span></td>
          <td class="text-muted">${escapeHtml(date)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" data-action="view" data-id="${j.id}" title="Ver">
              <i class="bi bi-eye"></i>
            </button>
            ${
              showModeration
                ? `
                  <button class="btn btn-sm btn-success me-1" data-action="approve" data-id="${j.id}" title="Aprobar">
                    <i class="bi bi-check2"></i>
                  </button>
                  <button class="btn btn-sm btn-warning me-1" data-action="reject" data-id="${j.id}" title="Rechazar">
                    <i class="bi bi-x"></i>
                  </button>
                `
                : ""
            }
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${j.id}" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function getById(id) {
  return allJobs.find((j) => String(j.id) === String(id));
}

async function updateJobStatus(job, status) {
  try {
    const updated = await apiFetch(`/api/admin/jobs/${job.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    Object.assign(job, updated);
  } catch (e) {
    showToast(
      `No se pudo actualizar status. ` +
        `Asegúrate de que job_posts tenga columna 'status' y permisos/RLS. Detalle: ${e.message}`,
      "warning",
    );
    return false;
  }
  showToast("Estado actualizado: " + prettyStatus(job.status), "success");
  return true;
}

async function deactivateJob(job) {
  const ok = confirm(
    "¿Marcar esta oferta como inactiva?",
  );
  if (!ok) return false;
  try {
    const updated = await apiFetch(`/api/admin/jobs/${job.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "inactivo" }),
    });
    Object.assign(job, updated);
  } catch (e) {
    showToast("No se pudo inactivar: " + e.message, "danger");
    return false;
  }
  showToast("Oferta marcada como inactiva.", "success");
  return true;
}

function rerender() {
  computeStats(allJobs);
  const filtered = applyFilters(allJobs);
  render(filtered);
}

function wireEvents() {
  [els.search, els.statusFilter, els.contractFilter].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", rerender);
    el.addEventListener("change", rerender);
  });

  if (els.tbody) {
    els.tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      const job = getById(id);
      if (!job) return;

      if (action === "view") {
        openJsonModal("Detalle (job_posts)", job);
        return;
      }
      if (action === "approve") {
        await updateJobStatus(job, "activo");
        rerender();
        return;
      }
      if (action === "reject") {
        await updateJobStatus(job, "rechazada");
        rerender();
        return;
      }
      if (action === "delete") {
        await deactivateJob(job);
        rerender();
      }
    });
  }
}

async function init() {
  wireEvents();
  const session = await requireSession();
  if (!session) return;
  ensureAdminBanner(session);

  await loadJobs();
  rerender();
}

document.addEventListener("DOMContentLoaded", init);
