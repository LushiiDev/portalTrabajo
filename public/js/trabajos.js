const SUPABASE_URL = "https://unyqdgntdqwauzckzoky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vaV2z3ugubTKsqcbgk8prw_wTWQsXJS";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_BASE = "http://127.0.0.1:3000";

let todosLosJobs = [];
let searchQuery = "";
let searchLocation = "";
let companiesById = new Map();

function normalizeJobStatus(status) {
  const normalized = normalizeFilterValue(status);
  if (normalized === "active") return "activa";
  if (normalized === "activo") return "activa";
  return normalized;
}

function isActiveJob(job) {
  return normalizeJobStatus(job?.status) === "activa";
}

function normalizeFilterValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesNormalized(source, target) {
  return normalizeFilterValue(source).includes(normalizeFilterValue(target));
}

function formatSalaryValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCompanyDisplay(companyId) {
  const company = companiesById.get(companyId) || null;

  return {
    name: company?.name || "Empresa",
    logoUrl: company?.logo_url || "",
  };
}

function readSearchParams() {
  const params = new URLSearchParams(window.location.search);
  searchQuery = (params.get("q") || "").trim().toLowerCase();
  searchLocation = (params.get("location") || "").trim().toLowerCase();
}

function applyIndexSearchFilters(jobs) {
  return jobs.filter((job) => {
    const title = (job.title || "").toLowerCase();
    const description = (job.description || "").toLowerCase();
    const location = (job.location || "").toLowerCase();

    const matchesQuery =
      !searchQuery ||
      title.includes(searchQuery) ||
      description.includes(searchQuery);

    const matchesLocation = !searchLocation || location.includes(searchLocation);

    return matchesQuery && matchesLocation;
  });
}

async function actualizarNavbarAuth() {
  const authActions    = document.getElementById("authActions");
  const userMenu       = document.getElementById("userMenu");
  const userEmailLabel = document.getElementById("userEmailLabel");
  const logoutBtn      = document.getElementById("logoutBtn");

  const { data, error } = await supabaseClient.auth.getSession();
  const session = data?.session;

  if (error || !session) {
    authActions.classList.remove("d-none");
    userMenu.classList.add("d-none");
    return;
  }

  authActions.classList.add("d-none");
  userMenu.classList.remove("d-none");

  let profileData = null;
  try {
    const { data } = await supabaseClient
      .from("profiles")
      .select("tipo_cuenta, full_name")
      .eq("id", session.user?.id)
      .maybeSingle();
    profileData = data || null;
  } catch {
    profileData = null;
  }

  const tipoCuenta = profileData?.tipo_cuenta || session.user?.user_metadata?.tipo_cuenta || "usuario";
  const userLabel = profileData?.full_name || session.user?.email || "Usuario";

  if (userEmailLabel) {
    userEmailLabel.textContent = userLabel;
  }

  const profileIcon = userMenu.querySelector(".dropdown-menu .bi-person");
  const profileLink = profileIcon ? profileIcon.closest("a.dropdown-item") : null;
  if (profileLink) {
    profileLink.href = tipoCuenta === "empresa" ? "./dashBoardEmpresa.html" : "./perfil.html";
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabaseClient.auth.signOut();
      window.location.reload();
    };
  }
}

function getBadgeClass(contractType) {
  if (!contractType) return "bg-secondary";
  const tipo = normalizeFilterValue(contractType);
  if (tipo.includes("tiempo completo")) return "bg-primary";
  if (tipo.includes("medio tiempo")) return "bg-info text-dark";
  if (tipo.includes("freelance")) return "bg-warning text-dark";
  if (tipo.includes("practicas")) return "bg-success";
  return "bg-secondary";
}

function filterBySelectedValues(jobValue, selectedValues) {
  if (!selectedValues.length) {
    return true;
  }

  const normalizedJobValue = normalizeFilterValue(jobValue);
  return selectedValues.some((selectedValue) => normalizedJobValue.includes(normalizeFilterValue(selectedValue)));
}

function renderJobs(jobs) {
  const lista    = document.getElementById("jobList");
  const noResult = document.getElementById("noResults");

  lista.innerHTML = "";

  if (jobs.length === 0) {
    noResult.classList.remove("d-none");
    return;
  }

  noResult.classList.add("d-none");

  jobs.forEach((job) => {
    const salMin = formatSalaryValue(job.salary_min);
    const salMax = formatSalaryValue(job.salary_max);
    const salario = salMin && salMax ? `${salMin} - ${salMax}` : salMin || salMax || "A convenir";
    const badge   = getBadgeClass(job.contract_type);
    const company = getCompanyDisplay(job.company_id);
    const companyName = escapeHtml(company.name);
    const companyLogoHtml = company.logoUrl
      ? `<img src="${escapeHtml(company.logoUrl)}" alt="${companyName}" class="rounded-circle border bg-white flex-shrink-0" style="width: 42px; height: 42px; object-fit: cover;" />`
      : `<div class="rounded-circle border bg-white d-flex align-items-center justify-content-center flex-shrink-0 text-muted" style="width: 42px; height: 42px;"><i class="bi bi-building"></i></div>`;

    const card = document.createElement("div");
    card.className = "card mb-3 shadow-sm";
    card.innerHTML = `
      <div class="card-body d-flex align-items-center gap-3">
        <div class="flex-shrink-0 d-none d-sm-flex align-items-center justify-content-center">
          ${companyLogoHtml}
        </div>
        <div class="flex-grow-1 min-w-0">
          <h6 class="mb-0 fw-bold text-truncate">${job.title || "Sin título"}</h6>
          <div class="d-flex align-items-center gap-2 text-muted small mb-1 flex-wrap">
            <span class="d-inline-flex align-items-center gap-1 text-truncate">
              <span class="fw-medium text-body">${companyName}</span>
            </span>
            <span class="text-muted">·</span>
            <span class="text-truncate">${job.location || "Ubicación no especificada"}</span>
          </div>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <small class="text-muted">
              <i class="bi bi-cash"></i> ${salario}
            </small>
            ${job.contract_type ? `<span class="badge ${badge}" style="font-size:0.75rem;">${job.contract_type}</span>` : ""}
            ${job.experience_level ? `<span class="badge bg-light text-dark border" style="font-size:0.75rem;">${job.experience_level}</span>` : ""}
          </div>
        </div>
        <div class="flex-shrink-0">
          <button class="btn btn-primary btn-sm" onclick="verOferta('${job.id}')">
            Ver Oferta
          </button>
        </div>
      </div>
    `;
    lista.appendChild(card);
  });
}

function verOferta(jobId) {
  sessionStorage.setItem("jobId", jobId);
  window.location.href = `informacionEmpleo.html?id=${jobId}`;
}

async function cargarJobs() {
  try {
    const [jobsRes, companiesRes] = await Promise.all([
      fetch(`${API_BASE}/jobs`),
      fetch(`${API_BASE}/api/companies`),
    ]);

    if (!jobsRes.ok) throw new Error("Error al obtener trabajos");

    const companies = companiesRes.ok ? await companiesRes.json() : [];
    companiesById = new Map((companies || []).map((company) => [company.id, company]));

    const allJobs = await jobsRes.json();
    todosLosJobs = (allJobs || []).filter((job) => isActiveJob(job));
    const jobsFiltradosIniciales = applyIndexSearchFilters(todosLosJobs);
    renderJobs(jobsFiltradosIniciales);
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("salaryRange").addEventListener("input", function () {
  document.getElementById("salaryLabel").textContent = formatSalaryValue(Number(this.value) * 1000) || "A convenir";
});

document.getElementById("btnFiltrar").addEventListener("click", () => {
  const base = applyIndexSearchFilters(todosLosJobs);
  const contratos = [...document.querySelectorAll(".filter-contract:checked")].map((c) => c.value.toLowerCase());
  const workModes = [...document.querySelectorAll(".filter-workmode:checked")].map((c) => c.value.toLowerCase());
  const exps      = [...document.querySelectorAll(".filter-exp:checked")].map((c) => c.value.toLowerCase());
  const salMax    = parseInt(document.getElementById("salaryRange").value) * 1000;

  let filtrados = base;

  filtrados = filtrados.filter((job) => filterBySelectedValues(job.contract_type, contratos));
  filtrados = filtrados.filter((job) => filterBySelectedValues(job.work_mode, workModes));

  filtrados = filtrados.filter((job) => filterBySelectedValues(job.experience_level, exps));

  filtrados = filtrados.filter((job) => !job.salary_min || job.salary_min <= salMax);

  renderJobs(filtrados);
});

document.getElementById("btnLimpiar").addEventListener("click", () => {
  document.querySelectorAll(".filter-contract, .filter-workmode, .filter-exp").forEach((c) => (c.checked = false));
  document.getElementById("salaryRange").value = 100;
  document.getElementById("salaryLabel").textContent = "US$100,000";
  renderJobs(applyIndexSearchFilters(todosLosJobs));
});

readSearchParams();
actualizarNavbarAuth();
cargarJobs();

supabaseClient.auth.onAuthStateChange(() => {
  actualizarNavbarAuth();
});