let dashboardCompany = null;
let dashboardJobs = [];
let dashboardApplications = [];

function normalizeJobStatus(rawStatus) {
  const status = (rawStatus || "pendiente").toString().trim().toLowerCase();
  if (status === "active") return "activa";
  if (status === "closed") return "cerrada";
  return status;
}

function statusBadgeHtml(rawStatus) {
  const status = normalizeJobStatus(rawStatus);
  if (status === "activa") {
    return '<span class="badge rounded-pill bg-success bg-opacity-10 text-success fw-normal">Activa</span>';
  }
  if (status === "cerrada") {
    return '<span class="badge rounded-pill bg-danger bg-opacity-10 text-danger fw-normal">Cerrada</span>';
  }
  return '<span class="badge rounded-pill bg-warning bg-opacity-10 text-warning fw-normal">Pendiente</span>';
}

function canArchiveJob(rawStatus) {
  return normalizeJobStatus(rawStatus) === "activa";
}

function applicantsCountByJob() {
  const map = new Map();
  dashboardApplications.forEach((application) => {
    const jobId = application?.job_post_id;
    if (!jobId) return;
    map.set(jobId, (map.get(jobId) || 0) + 1);
  });
  return map;
}

function renderDashboardCards() {
  const totalJobsCard = document.getElementById("totalJobsCard");
  const totalApplicantsCard = document.getElementById("totalApplicantsCard");
  const activeJobsCard = document.getElementById("activeJobsCard");

  const totalJobs = dashboardJobs.length;
  const applicantsMap = applicantsCountByJob();
  const totalApplicants = dashboardJobs.reduce((acc, job) => acc + (applicantsMap.get(job.id) || 0), 0);
  const activeJobs = dashboardJobs.filter((job) => normalizeJobStatus(job.status) === "activa").length;

  if (totalJobsCard) totalJobsCard.textContent = String(totalJobs);
  if (totalApplicantsCard) totalApplicantsCard.textContent = String(totalApplicants);
  if (activeJobsCard) activeJobsCard.textContent = String(activeJobs);
}

function renderRecentJobsTable() {
  const tableBody = document.getElementById("recentJobsTableBody");
  if (!tableBody) return;

  if (dashboardJobs.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted py-3">Aun no has publicado vacantes.</td>
      </tr>
    `;
    return;
  }

  const applicantsMap = applicantsCountByJob();

  tableBody.innerHTML = dashboardJobs
    .slice(0, 6)
    .map((job) => {
      const applicants = applicantsMap.get(job.id) || 0;
      const archiveButton = canArchiveJob(job.status)
        ? `<button class="btn btn-outline-danger btn-sm" data-action="archive" data-id="${job.id}">Archivar</button>`
        : '<button class="btn btn-outline-danger btn-sm" disabled>Archivar</button>';

      return `
        <tr class="border-bottom">
          <td class="small">${job.title || "-"}</td>
          <td>${statusBadgeHtml(job.status)}</td>
          <td class="small">${applicants}</td>
          <td class="d-flex gap-1">
            <button class="btn btn-outline-secondary btn-sm" data-action="view" data-id="${job.id}">Ver</button>
            <button class="btn btn-outline-secondary btn-sm" data-action="edit" data-id="${job.id}">Editar</button>
            ${archiveButton}
          </td>
        </tr>
      `;
    })
    .join("");
}

async function fetchDashboardData(companyId) {
  const [jobsResponse, applicationsResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/jobs`),
    fetch(`${API_BASE_URL}/applications`),
  ]);

  if (!jobsResponse.ok) {
    throw new Error("No se pudieron obtener las vacantes");
  }

  if (!applicationsResponse.ok) {
    throw new Error("No se pudieron obtener las postulaciones");
  }

  const allJobs = await jobsResponse.json();
  dashboardApplications = await applicationsResponse.json();

  dashboardJobs = (allJobs || [])
    .filter((job) => job.company_id === companyId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

async function archiveJob(jobId) {
  const job = dashboardJobs.find((item) => item.id === jobId);
  if (!job) return;

  if (!canArchiveJob(job.status)) {
    alert("Solo puedes archivar vacantes activas.");
    return;
  }

  const confirmed = window.confirm("¿Seguro que deseas archivar esta vacante?");
  if (!confirmed) return;

  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "cerrada" }),
  });

  if (!response.ok) {
    throw new Error("No se pudo archivar la vacante");
  }
}

function setupDashboardActions() {
  const newOfferBtn = document.getElementById("newOfferBtn");
  const tableBody = document.getElementById("recentJobsTableBody");

  if (newOfferBtn) {
    newOfferBtn.addEventListener("click", () => {
      window.location.href = "./publicarOferta.html";
    });
  }

  if (!tableBody) return;

  tableBody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const action = target.dataset.action;
    const jobId = target.dataset.id;
    if (!action || !jobId) return;

    if (action === "view") {
      window.location.href = "./vacante.html";
      return;
    }

    if (action === "edit") {
      window.location.href = "./vacante.html";
      return;
    }

    if (action === "archive") {
      try {
        await archiveJob(jobId);
        await fetchDashboardData(dashboardCompany.id);
        renderDashboardCards();
        renderRecentJobsTable();
      } catch (error) {
        console.error(error);
        alert("No se pudo archivar la vacante.");
      }
    }
  });
}

function setWelcomeMessage(companyName) {
  const welcome = document.getElementById("dashboardWelcome");
  if (!welcome) return;

  const safeName = companyName || "tu empresa";
  welcome.textContent = `Bienvenido al panel de empleador de ${safeName}`;
}

async function initDashboardEmpresa() {
  const session = await verificarSesionEmpresa();
  if (!session) return;

  await actualizarNavbarEmpresa();

  dashboardCompany = await obtenerDatosEmpresa(session.user.id);
  if (!dashboardCompany?.id) {
    alert("No encontramos datos de empresa para esta cuenta.");
    window.location.href = "./perfilEmpresa.html";
    return;
  }

  setWelcomeMessage(dashboardCompany.name);

  try {
    await fetchDashboardData(dashboardCompany.id);
    setupDashboardActions();
    renderDashboardCards();
    renderRecentJobsTable();
  } catch (error) {
    console.error("Error cargando dashboard de empresa:", error);
    const tableBody = document.getElementById("recentJobsTableBody");
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-danger py-3">No se pudieron cargar los datos del dashboard.</td>
        </tr>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initDashboardEmpresa);
