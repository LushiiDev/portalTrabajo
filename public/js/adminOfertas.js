import {
  ensureAdminBanner,
  formatDate,
  openJsonModal,
  requireSession,
  isDemoMode,
  setActiveSidebar,
  showToast,
  supabaseClient,
} from "./adminBase.js";

setActiveSidebar("adminofertas.html");

const els = {
  tbody: document.getElementById("jobsTbody"),
  search: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  contractFilter: document.getElementById("contractFilter"),
  statTotal: document.getElementById("statTotal"),
  statPending: document.getElementById("statPending"),
  statApproved: document.getElementById("statApproved"),
  statRejected: document.getElementById("statRejected"),
};

let allJobs = [];
const demoMode = isDemoMode();

function normalizeStatus(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("pend")) return "pendiente";
  if (v.includes("aprob") || v.includes("accept") || v.includes("ok")) return "aprobada";
  if (v.includes("rech") || v.includes("deny") || v.includes("reject")) return "rechazada";
  return v || "pendiente";
}

function prettyStatus(status) {
  const v = normalizeStatus(status);
  return v === "aprobada" ? "Aprobada" : v === "rechazada" ? "Rechazada" : "Pendiente";
}

function statusBadgeClass(status) {
  const v = normalizeStatus(status);
  return v === "aprobada" ? "badge-status" : v === "rechazada" ? "badge-status red" : "badge-status yellow";
}

async function loadJobs() {
  if (demoMode) {
    allJobs = [
      {
        id: "j1",
        title: "Frontend Developer",
        location: "Madrid",
        contract_type: "full-time",
        status: "pendiente",
        created_at: "2026-03-10T10:00:00Z",
        company: "TechCorp",
      },
      {
        id: "j2",
        title: "Backend Developer",
        location: "Barcelona",
        contract_type: "full-time",
        status: "aprobada",
        created_at: "2026-03-08T10:00:00Z",
        company: "InnovateSoft",
      },
      {
        id: "j3",
        title: "UX Designer",
        location: "Valencia",
        contract_type: "part-time",
        status: "rechazada",
        created_at: "2026-03-05T10:00:00Z",
        company: "DesignHub",
      },
      {
        id: "j4",
        title: "Full Stack Developer",
        location: "Remoto",
        contract_type: "full-time",
        status: "aprobada",
        created_at: "2026-03-12T10:00:00Z",
        company: "WebSolutions",
      },
    ];
    return;
  }

  const { data, error } = await supabaseClient.from("job_posts").select("*").order("created_at", { ascending: false });
  if (error) {
    showToast("No se pudieron cargar job_posts: " + error.message, "danger");
    allJobs = [];
    return;
  }
  allJobs = data || [];
}

function computeStats(jobs) {
  els.statTotal.textContent = jobs.length;
  els.statPending.textContent = jobs.filter((j) => normalizeStatus(j.status) === "pendiente").length;
  els.statApproved.textContent = jobs.filter((j) => normalizeStatus(j.status) === "aprobada").length;
  els.statRejected.textContent = jobs.filter((j) => normalizeStatus(j.status) === "rechazada").length;
}

function applyFilters(jobs) {
  const q = (els.search.value || "").trim().toLowerCase();
  const status = (els.statusFilter.value || "").trim().toLowerCase();
  const contract = (els.contractFilter.value || "").trim().toLowerCase();

  return jobs.filter((j) => {
    const matchesQ =
      !q ||
      String(j.title || "").toLowerCase().includes(q) ||
      String(j.location || "").toLowerCase().includes(q) ||
      String(j.contract_type || "").toLowerCase().includes(q);

    const matchesStatus = !status || normalizeStatus(j.status) === status;
    const matchesContract = !contract || String(j.contract_type || "").toLowerCase() === contract;
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
          <td><span class="badge-soft ${stCls}">${escapeHtml(st)}</span></td>
          <td class="text-muted">${escapeHtml(date)}</td>
          <td class="text-end">
            <button class="btn-action btn-view me-1" data-action="view" data-id="${j.id}" title="Ver">
              <i class="bi bi-eye"></i>
            </button>
            ${
              showModeration
                ? `
                  <button class="btn-action btn-ok me-1" data-action="approve" data-id="${j.id}" title="Aprobar">
                    <i class="bi bi-check2"></i>
                  </button>
                  <button class="btn-action btn-warn me-1" data-action="reject" data-id="${j.id}" title="Rechazar">
                    <i class="bi bi-x"></i>
                  </button>
                `
                : ""
            }
            <button class="btn-action btn-danger" data-action="delete" data-id="${j.id}" title="Eliminar">
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
  if (demoMode) {
    job.status = status;
    showToast("Modo demo: status actualizado localmente.", "info");
    return true;
  }
  const { data, error } = await supabaseClient
    .from("job_posts")
    .update({ status })
    .eq("id", job.id)
    .select()
    .single();

  if (error) {
    showToast(
      `No se pudo actualizar status. ` +
        `Asegúrate de que la tabla job_posts tenga una columna 'status' y permisos/RLS. Detalle: ${error.message}`,
      "warning",
    );
    return false;
  }

  Object.assign(job, data);
  showToast("Estado actualizado: " + prettyStatus(job.status), "success");
  return true;
}

async function deleteJob(job) {
  if (demoMode) {
    allJobs = allJobs.filter((j) => String(j.id) !== String(job.id));
    showToast("Modo demo: eliminado localmente.", "info");
    return true;
  }
  const ok = confirm("¿Eliminar esta oferta? (Se borrará el registro en job_posts)");
  if (!ok) return false;

  const { error } = await supabaseClient.from("job_posts").delete().eq("id", job.id);
  if (error) {
    showToast("No se pudo eliminar: " + error.message, "danger");
    return false;
  }

  allJobs = allJobs.filter((j) => String(j.id) !== String(job.id));
  showToast("Oferta eliminada.", "success");
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
        await updateJobStatus(job, "aprobada");
        rerender();
        return;
      }
      if (action === "reject") {
        await updateJobStatus(job, "rechazada");
        rerender();
        return;
      }
      if (action === "delete") {
        await deleteJob(job);
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
