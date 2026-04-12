const SUPABASE_URL = "https://unyqdgntdqwauzckzoky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vaV2z3ugubTKsqcbgk8prw_wTWQsXJS";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_BASE = "http://127.0.0.1:3000";

let todosLosJobs = [];
let searchQuery = "";
let searchLocation = "";

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

  const meta = session.user?.user_metadata || {};
  const tipoCuenta = meta.tipo_cuenta || "usuario";

  if (userEmailLabel) {
    userEmailLabel.textContent = session.user?.email || "Usuario";
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
  const tipo = contractType.toLowerCase();
  if (tipo.includes("full"))   return "bg-primary";
  if (tipo.includes("part"))   return "bg-info text-dark";
  if (tipo.includes("remote")) return "bg-success";
  return "bg-secondary";
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
    const salMin  = job.salary_min ? `$${job.salary_min / 1000}k` : null;
    const salMax  = job.salary_max ? `$${job.salary_max / 1000}k` : null;
    const salario = salMin && salMax ? `${salMin} - ${salMax}` : salMin || salMax || "A convenir";
    const badge   = getBadgeClass(job.contract_type);

    const card = document.createElement("div");
    card.className = "card mb-3 shadow-sm";
    card.innerHTML = `
      <div class="card-body d-flex align-items-center gap-3">
        <div class="flex-grow-1">
          <h6 class="mb-0 fw-bold">${job.title || "Sin título"}</h6>
          <small class="text-muted d-block mb-1">${job.location || "Ubicación no especificada"}</small>
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
    const res = await fetch(`${API_BASE}/jobs`);
    if (!res.ok) throw new Error("Error al obtener trabajos");
    todosLosJobs = await res.json();
    const jobsFiltradosIniciales = applyIndexSearchFilters(todosLosJobs);
    renderJobs(jobsFiltradosIniciales);
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("salaryRange").addEventListener("input", function () {
  document.getElementById("salaryLabel").textContent = `$${this.value}k`;
});

document.getElementById("btnFiltrar").addEventListener("click", () => {
  const base = applyIndexSearchFilters(todosLosJobs);
  const contratos = [...document.querySelectorAll(".filter-contract:checked")].map((c) => c.value.toLowerCase());
  const exps      = [...document.querySelectorAll(".filter-exp:checked")].map((c) => c.value.toLowerCase());
  const salMax    = parseInt(document.getElementById("salaryRange").value) * 1000;

  let filtrados = base;

  if (contratos.length > 0) {
    filtrados = filtrados.filter((job) =>
      job.contract_type && contratos.some((c) => job.contract_type.toLowerCase().includes(c))
    );
  }

  if (exps.length > 0) {
    filtrados = filtrados.filter((job) =>
      job.experience_level && exps.some((e) => job.experience_level.toLowerCase().includes(e))
    );
  }

  filtrados = filtrados.filter((job) => !job.salary_min || job.salary_min <= salMax);

  renderJobs(filtrados);
});

document.getElementById("btnLimpiar").addEventListener("click", () => {
  document.querySelectorAll(".filter-contract, .filter-exp").forEach((c) => (c.checked = false));
  document.getElementById("salaryRange").value = 100;
  document.getElementById("salaryLabel").textContent = "$100k";
  renderJobs(applyIndexSearchFilters(todosLosJobs));
});

readSearchParams();
actualizarNavbarAuth();
cargarJobs();

supabaseClient.auth.onAuthStateChange(() => {
  actualizarNavbarAuth();
});