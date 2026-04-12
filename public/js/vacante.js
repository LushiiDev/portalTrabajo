let currentCompany = null;
let allCompanyJobs = [];
let allApplications = [];
let profilesById = new Map();
let editJobModalInstance = null;
let applicationsModalInstance = null;

const APPLICATION_STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revision" },
  { value: "entrevista", label: "Entrevista" },
  { value: "aceptado", label: "Aceptado" },
  { value: "rechazado", label: "Rechazado" },
];

function formatDateEs(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatSalary(min, max) {
  const safeMin = Number(min || 0);
  const safeMax = Number(max || 0);
  return `${safeMin.toLocaleString("es-ES")} - ${safeMax.toLocaleString("es-ES")} USD`;
}

function normalizeStatus(rawStatus) {
  const status = (rawStatus || "pendiente").toString().trim().toLowerCase();
  if (status === "active") return "activa";
  if (status === "closed") return "cerrada";
  return status;
}

function canCompanyChangeStatus(currentStatus) {
  return normalizeStatus(currentStatus) === "activa";
}

function buildCloseButton(job) {
  const status = normalizeStatus(job.status);

  if (status !== "activa") {
    return '<button class="btn btn-outline-danger btn-sm" disabled>Cerrar</button>';
  }

  return `<button class="btn btn-outline-danger btn-sm" data-action="close" data-id="${job.id}">Cerrar</button>`;
}

function getStatusBadge(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "activa") {
    return '<span class="badge rounded-pill bg-success bg-opacity-10 text-success fw-normal">Activa</span>';
  }

  if (normalized === "cerrada") {
    return '<span class="badge rounded-pill bg-secondary bg-opacity-10 text-secondary fw-normal">Cerrada</span>';
  }

  return '<span class="badge rounded-pill bg-warning bg-opacity-10 text-warning fw-normal">Pendiente</span>';
}

function getApplicantsByJobId() {
  const map = new Map();
  allApplications.forEach((application) => {
    const jobId = application?.job_post_id;
    if (!jobId) return;
    map.set(jobId, (map.get(jobId) || 0) + 1);
  });
  return map;
}

function normalizeApplicationStatus(rawStatus) {
  const status = (rawStatus || "pendiente").toString().trim().replace(/_/g, " ");
  if (!status) return "Pendiente";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function sanitizeStatusValue(rawStatus) {
  return (rawStatus || "pendiente").toString().trim().toLowerCase().replace(/\s+/g, "_");
}

function buildApplicationStatusSelect(applicationId, rawStatus) {
  const selectedStatus = sanitizeStatusValue(rawStatus);
  const optionsHtml = APPLICATION_STATUS_OPTIONS.map((option) => {
    const selected = option.value === selectedStatus ? " selected" : "";
    return `<option value="${option.value}"${selected}>${option.label}</option>`;
  }).join("");

  return `
    <select class="form-select form-select-sm" data-role="application-status" data-application-id="${applicationId}">
      ${optionsHtml}
    </select>
  `;
}

function getCandidateLabel(candidateId) {
  if (!candidateId) return "Sin candidato";
  const profile = profilesById.get(candidateId);
  if (profile?.full_name) return profile.full_name;
  return candidateId;
}

function getCandidateCvUrl(application) {
  if (!application) return "";

  if (application.cv_url) {
    return application.cv_url;
  }

  const candidateId = application.candidate_id || application.user_id;
  if (!candidateId) {
    return "";
  }

  const profile = profilesById.get(candidateId);
  return profile?.cv_url || "";
}

function getFilteredJobs() {
  const searchInput = document.getElementById("jobsSearchInput");
  const statusFilter = document.getElementById("statusFilter");
  const contractTypeFilter = document.getElementById("contractTypeFilter");

  const search = (searchInput?.value || "").trim().toLowerCase();
  const selectedStatus = (statusFilter?.value || "").trim().toLowerCase();
  const selectedContract = (contractTypeFilter?.value || "").trim().toLowerCase();

  return allCompanyJobs.filter((job) => {
    const matchesSearch =
      !search ||
      (job.title || "").toLowerCase().includes(search) ||
      (job.location || "").toLowerCase().includes(search);

    const jobStatus = normalizeStatus(job.status);
    const matchesStatus = !selectedStatus || jobStatus === selectedStatus;

    const jobContract = (job.contract_type || "").toLowerCase();
    const matchesContract = !selectedContract || jobContract === selectedContract;

    return matchesSearch && matchesStatus && matchesContract;
  });
}

function renderSummary(jobs) {
  const applicantsByJobId = getApplicantsByJobId();

  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((job) => normalizeStatus(job.status) === "activa").length;
  const totalApplicants = jobs.reduce((acc, job) => acc + (applicantsByJobId.get(job.id) || 0), 0);

  const totalJobsValue = document.getElementById("totalJobsValue");
  const activeJobsValue = document.getElementById("activeJobsValue");
  const totalApplicantsValue = document.getElementById("totalApplicantsValue");

  if (totalJobsValue) totalJobsValue.textContent = String(totalJobs);
  if (activeJobsValue) activeJobsValue.textContent = String(activeJobs);
  if (totalApplicantsValue) totalApplicantsValue.textContent = String(totalApplicants);
}

function renderTable() {
  const tableBody = document.getElementById("jobsTableBody");
  if (!tableBody) return;

  const applicantsByJobId = getApplicantsByJobId();
  const jobs = getFilteredJobs();

  if (jobs.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">No tienes vacantes con esos filtros.</td>
      </tr>
    `;
    renderSummary(jobs);
    return;
  }

  tableBody.innerHTML = jobs
    .map((job) => {
      const applicants = applicantsByJobId.get(job.id) || 0;
      return `
        <tr class="border-bottom">
          <td class="ps-3 fw-medium small">${job.title || "-"}</td>
          <td class="small text-muted">${job.location || "-"}</td>
          <td class="small">${job.contract_type || "-"}</td>
          <td class="small">${formatSalary(job.salary_min, job.salary_max)}</td>
          <td>${getStatusBadge(job.status)}</td>
          <td>
            <span class="badge rounded-pill bg-primary text-white">${applicants}</span>
          </td>
          <td class="small text-muted">${formatDateEs(job.created_at)}</td>
          <td class="d-flex gap-1">
            <button class="btn btn-outline-secondary btn-sm" data-action="view" data-id="${job.id}">Ver</button>
            <button class="btn btn-outline-secondary btn-sm" data-action="edit" data-id="${job.id}">Editar</button>
            ${buildCloseButton(job)}
          </td>
        </tr>
      `;
    })
    .join("");

  renderSummary(jobs);
}

async function loadApplications() {
  try {
    const response = await fetch(`${API_BASE_URL}/applications`);
    if (!response.ok) throw new Error("No se pudo obtener applications");
    allApplications = await response.json();
  } catch (error) {
    console.error("Error cargando postulaciones:", error);
    allApplications = [];
  }
}

async function loadProfiles() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/profiles`);
    if (!response.ok) throw new Error("No se pudo obtener profiles");

    const profiles = await response.json();
    profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  } catch (error) {
    console.error("Error cargando perfiles:", error);
    profilesById = new Map();
  }
}

async function loadJobs() {
  const response = await fetch(`${API_BASE_URL}/jobs`);
  if (!response.ok) {
    throw new Error("No se pudo obtener vacantes");
  }

  const jobs = await response.json();
  allCompanyJobs = jobs
    .filter((job) => job.company_id === currentCompany.id)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

async function closeJob(jobId) {
  const job = getJobById(jobId);
  if (!job) {
    throw new Error("No se encontro la vacante");
  }

  if (!canCompanyChangeStatus(job.status)) {
    alert("Solo puedes cerrar vacantes que ya fueron aprobadas (estado activa).");
    return;
  }

  const confirmed = window.confirm("¿Seguro que quieres cerrar esta vacante?");
  if (!confirmed) return;

  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "cerrada" }),
  });

  if (!response.ok) {
    throw new Error("No se pudo cerrar la vacante");
  }
}

function getJobById(jobId) {
  return allCompanyJobs.find((job) => job.id === jobId) || null;
}

function setupApplicationsModal() {
  const modalElement = document.getElementById("applicationsModal");
  if (!modalElement || !window.bootstrap?.Modal) return;

  applicationsModalInstance = window.bootstrap.Modal.getOrCreateInstance(modalElement);

  const tableBody = document.getElementById("applicationsTableBody");
  if (!tableBody) return;

  tableBody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const action = target.dataset.action;
    if (action !== "update-application-status") return;

    const applicationId = target.dataset.applicationId;
    const jobId = target.dataset.jobId;
    if (!applicationId || !jobId) return;

    const row = target.closest("tr");
    const statusSelect = row?.querySelector('select[data-role="application-status"]');
    const nextStatus = statusSelect?.value || "pendiente";
    const currentStatus = sanitizeStatusValue(target.dataset.currentStatus || "pendiente");

    if (sanitizeStatusValue(nextStatus) === currentStatus) {
      return;
    }

    target.disabled = true;
    const originalText = target.textContent;
    target.textContent = "Guardando...";

    try {
      const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: sanitizeStatusValue(nextStatus) }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar el estado de la postulacion");
      }

      await openApplicationsModal(jobId);
      renderTable();
      alert("Estado de postulacion actualizado.");
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el estado de la postulacion.");
      target.disabled = false;
      target.textContent = originalText || "Guardar";
    }
  });
}

async function openApplicationsModal(jobId) {
  const job = getJobById(jobId);
  if (!job) {
    alert("No se encontro la vacante.");
    return;
  }

  const subtitle = document.getElementById("applicationsModalSubtitle");
  const tableBody = document.getElementById("applicationsTableBody");

  if (!tableBody) return;

  if (subtitle) {
    subtitle.textContent = `Vacante: ${job.title || "Sin titulo"}`;
  }

  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted py-3">Cargando postulaciones...</td>
    </tr>
  `;

  if (applicationsModalInstance) {
    applicationsModalInstance.show();
  }

  await loadApplications();

  const rows = allApplications
    .filter((application) => {
      const applicationJobId = application?.job_post_id || application?.job_id;
      return String(applicationJobId) === String(jobId);
    })
    .sort((a, b) => new Date(b.applied_at || b.created_at || 0) - new Date(a.applied_at || a.created_at || 0));

  if (rows.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-3">Aun no hay postulaciones para esta vacante.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = rows
    .map((application) => {
      const candidateId = application.candidate_id || application.user_id;
      const candidate = getCandidateLabel(candidateId);
      const cvUrl = getCandidateCvUrl(application);
      const cvCell = cvUrl
        ? `<a href="${cvUrl}" target="_blank" rel="noopener noreferrer">Ver CV</a>`
        : "Sin CV";
      const normalizedStatus = sanitizeStatusValue(application.status);
      const statusControl = buildApplicationStatusSelect(application.id, normalizedStatus);

      return `
        <tr>
          <td>${candidate}</td>
          <td>${cvCell}</td>
          <td>${statusControl}</td>
          <td>${formatDateEs(application.applied_at || application.created_at)}</td>
          <td>
            <button
              class="btn btn-outline-primary btn-sm"
              data-action="update-application-status"
              data-application-id="${application.id}"
              data-job-id="${jobId}"
              data-current-status="${normalizedStatus}"
            >
              Guardar
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function setupEditModal() {
  const modalElement = document.getElementById("editJobModal");
  const editJobForm = document.getElementById("editJobForm");
  if (!modalElement || !editJobForm || !window.bootstrap?.Modal) return;

  editJobModalInstance = window.bootstrap.Modal.getOrCreateInstance(modalElement);

  editJobForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const jobId = document.getElementById("editJobId")?.value || "";
    const title = (document.getElementById("editJobTitle")?.value || "").trim();
    const description = (document.getElementById("editJobDescription")?.value || "").trim();
    const location = (document.getElementById("editJobLocation")?.value || "").trim();
    const contractType = (document.getElementById("editJobContractType")?.value || "").trim();
    const workMode = (document.getElementById("editWorkMode")?.value || "").trim();
    const experienceLevel = (document.getElementById("editExperienceLevel")?.value || "").trim();
    const selectedStatus = (document.getElementById("editStatus")?.value || "").trim();
    const statusHint = document.getElementById("editStatusHelp");
    const salaryMin = Number(document.getElementById("editSalaryMin")?.value || 0);
    const salaryMax = Number(document.getElementById("editSalaryMax")?.value || 0);
    const job = getJobById(jobId);

    if (!job) {
      alert("No se encontro la vacante a editar.");
      return;
    }

    const currentStatus = normalizeStatus(job.status);
    const canUpdateStatus = canCompanyChangeStatus(currentStatus);
    const status = canUpdateStatus ? normalizeStatus(selectedStatus) : currentStatus;

    if (!jobId || !title || !description || !location || !contractType || !workMode || !experienceLevel || !status) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    if (canUpdateStatus && status !== "activa" && status !== "cerrada") {
      alert("Solo puedes mantener activa la vacante o cerrarla.");
      return;
    }

    if (!canUpdateStatus && statusHint) {
      statusHint.textContent = "Esta vacante sigue pendiente de aprobacion por admin. El estado no puede cambiarse.";
    }

    if (description.length < 100) {
      alert("La descripcion debe tener al menos 100 caracteres.");
      return;
    }

    if (Number.isNaN(salaryMin) || Number.isNaN(salaryMax) || salaryMin < 0 || salaryMax < 0) {
      alert("Los salarios deben ser numeros validos.");
      return;
    }

    if (salaryMax < salaryMin) {
      alert("El salario maximo no puede ser menor que el salario minimo.");
      return;
    }

    const saveBtn = document.getElementById("saveEditJobBtn");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Guardando...";
    }

    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          location,
          contract_type: contractType,
          work_mode: workMode,
          experience_level: experienceLevel,
          status,
          salary_min: salaryMin,
          salary_max: salaryMax,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar la vacante");
      }

      await loadJobs();
      renderTable();
      editJobModalInstance.hide();
      alert("Vacante actualizada correctamente.");
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar la vacante.");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Guardar cambios";
      }
    }
  });
}

function openEditJobModal(jobId) {
  const job = getJobById(jobId);
  if (!job) {
    alert("No se encontro la vacante a editar.");
    return;
  }

  const editJobId = document.getElementById("editJobId");
  const editJobTitle = document.getElementById("editJobTitle");
  const editJobDescription = document.getElementById("editJobDescription");
  const editJobLocation = document.getElementById("editJobLocation");
  const editJobContractType = document.getElementById("editJobContractType");
  const editWorkMode = document.getElementById("editWorkMode");
  const editExperienceLevel = document.getElementById("editExperienceLevel");
  const editStatus = document.getElementById("editStatus");
  const editStatusHelp = document.getElementById("editStatusHelp");
  const editSalaryMin = document.getElementById("editSalaryMin");
  const editSalaryMax = document.getElementById("editSalaryMax");

  if (!editJobId || !editJobTitle || !editJobDescription || !editJobLocation || !editJobContractType || !editWorkMode || !editExperienceLevel || !editStatus || !editSalaryMin || !editSalaryMax) {
    return;
  }

  const normalizedStatus = normalizeStatus(job.status);
  const canUpdateStatus = canCompanyChangeStatus(normalizedStatus);

  editJobId.value = job.id;
  editJobTitle.value = job.title || "";
  editJobDescription.value = job.description || "";
  editJobLocation.value = job.location || "";
  editJobContractType.value = job.contract_type || "Tiempo completo";
  editWorkMode.value = job.work_mode || "Presencial";
  editExperienceLevel.value = job.experience_level || "Junior (0-2 años)";
  editStatus.value = normalizedStatus;
  editStatus.disabled = !canUpdateStatus;

  if (editStatusHelp) {
    if (canUpdateStatus) {
      editStatusHelp.textContent = "Puedes cerrar esta vacante porque ya esta aprobada.";
    } else {
      editStatusHelp.textContent = "Pendiente de aprobacion por admin: el estado no puede editarse.";
    }
  }

  for (const option of editStatus.options) {
    if (canUpdateStatus) {
      option.disabled = option.value === "pendiente";
    } else {
      option.disabled = option.value !== normalizedStatus;
    }
  }

  editSalaryMin.value = String(job.salary_min || 0);
  editSalaryMax.value = String(job.salary_max || 0);

  if (editJobModalInstance) {
    editJobModalInstance.show();
  }
}

function setupFilters() {
  const searchInput = document.getElementById("jobsSearchInput");
  const statusFilter = document.getElementById("statusFilter");
  const contractTypeFilter = document.getElementById("contractTypeFilter");

  if (searchInput) searchInput.addEventListener("input", renderTable);
  if (statusFilter) statusFilter.addEventListener("change", renderTable);
  if (contractTypeFilter) contractTypeFilter.addEventListener("change", renderTable);
}

function setupButtons() {
  const newVacancyBtn = document.getElementById("newVacancyBtn");
  if (newVacancyBtn) {
    newVacancyBtn.addEventListener("click", () => {
      window.location.href = "./publicarOferta.html";
    });
  }

  const tableBody = document.getElementById("jobsTableBody");
  if (!tableBody) return;

  tableBody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const action = target.dataset.action;
    const jobId = target.dataset.id;
    if (!action || !jobId) return;

    if (action === "view") {
      await openApplicationsModal(jobId);
      return;
    }

    if (action === "edit") {
      openEditJobModal(jobId);
      return;
    }

    if (action === "close") {
      try {
        await closeJob(jobId);
        await loadJobs();
        renderTable();
      } catch (error) {
        console.error(error);
        alert("No se pudo cerrar la vacante.");
      }
    }
  });
}

async function initVacantesPage() {
  const tableBody = document.getElementById("jobsTableBody");
  if (!tableBody) return;

  const session = await verificarSesionEmpresa();
  if (!session) return;

  currentCompany = await obtenerDatosEmpresa(session.user.id);
  if (!currentCompany?.id) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">No se encontro empresa asociada a tu cuenta.</td>
      </tr>
    `;
    return;
  }

  try {
    await Promise.all([loadJobs(), loadApplications(), loadProfiles()]);
    setupFilters();
    setupEditModal();
    setupApplicationsModal();
    setupButtons();
    renderTable();
  } catch (error) {
    console.error("Error cargando vacantes:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger py-4">No se pudieron cargar las vacantes.</td>
      </tr>
    `;
  }
}

document.addEventListener("DOMContentLoaded", initVacantesPage);
