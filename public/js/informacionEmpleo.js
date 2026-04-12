const SUPABASE_URL = "https://unyqdgntdqwauzckzoky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vaV2z3ugubTKsqcbgk8prw_wTWQsXJS";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_BASE = "http://127.0.0.1:3000";

let sesionActiva = null;
let jobActual = null;
let companyMap = new Map();

async function actualizarNavbarAuth() {
  const authActions    = document.getElementById("authActions");
  const userMenu       = document.getElementById("userMenu");
  const userEmailLabel = document.getElementById("userEmailLabel");
  const logoutBtn      = document.getElementById("logoutBtn");
  const profileIcon    = userMenu?.querySelector(".dropdown-menu .bi-person");
  const profileLink    = profileIcon ? profileIcon.closest("a.dropdown-item") : null;

  const { data, error } = await supabaseClient.auth.getSession();
  const session = data?.session;
  sesionActiva = session || null;

  if (error || !session) {
    authActions.classList.remove("d-none");
    userMenu.classList.add("d-none");
  } else {
    const tipoCuenta = session.user?.user_metadata?.tipo_cuenta || "usuario";
    authActions.classList.add("d-none");
    userMenu.classList.remove("d-none");
    if (userEmailLabel) userEmailLabel.textContent = session.user?.email || "Usuario";
    if (profileLink) {
      profileLink.href = tipoCuenta === "empresa" ? "./dashBoardEmpresa.html" : "./perfil.html";
    }
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabaseClient.auth.signOut();
      window.location.reload();
    };
  }

  await mostrarBotonPostular();
}

async function mostrarBotonPostular() {
  const btnPostularme        = document.getElementById("btnPostularme");
  const btnLoginParaPostular = document.getElementById("btnLoginParaPostular");
  const msgPostulado         = document.getElementById("msgPostulado");

  if (sesionActiva) {
    const tipoCuenta = sesionActiva.user?.user_metadata?.tipo_cuenta || "usuario";
    if (tipoCuenta === "empresa") {
      btnPostularme.classList.add("d-none");
      btnLoginParaPostular.classList.add("d-none");
      msgPostulado.textContent = "Las cuentas de empresa no pueden postularse.";
      msgPostulado.classList.remove("d-none");
      return;
    }

    btnPostularme.classList.remove("d-none");
    btnLoginParaPostular.classList.add("d-none");
    if (jobActual) {
      await verificarPostulacionExistente();
    }
  } else {
    btnPostularme.classList.add("d-none");
    btnLoginParaPostular.classList.remove("d-none");
    msgPostulado.classList.add("d-none");
  }
}

function getBadgeContrato(contractType) {
  if (!contractType) return "bg-secondary";
  const tipo = contractType.toLowerCase();
  if (tipo.includes("full"))   return "bg-primary";
  if (tipo.includes("part"))   return "bg-info text-dark";
  if (tipo.includes("remote")) return "bg-success";
  return "bg-secondary";
}

async function cargarJob() {
  const params = new URLSearchParams(window.location.search);
  const jobId  = params.get("id") || sessionStorage.getItem("jobId");
  const errorMsg = document.getElementById("errorMsg");

  if (!jobId) {
    if (errorMsg) {
      errorMsg.textContent = "No se encontro el ID de la vacante.";
      errorMsg.classList.remove("d-none");
    }
    return;
  }

  try {
    const [jobsRes, companiesRes] = await Promise.all([
      fetch(`${API_BASE}/jobs`),
      fetch(`${API_BASE}/api/companies`),
    ]);

    if (!jobsRes.ok) throw new Error("Error al obtener trabajos");
    const jobs = await jobsRes.json();
    const companies = companiesRes.ok ? await companiesRes.json() : [];

    companyMap = new Map((companies || []).map((company) => [company.id, company]));
    jobActual = jobs.find(j => String(j.id) === String(jobId));
    if (!jobActual) {
      throw new Error("Vacante no encontrada");
    }

    renderJob(jobActual);
    renderEmpresa(jobActual.company_id);
    await mostrarBotonPostular();
  } catch (err) {
    console.error(err);
    if (errorMsg) {
      errorMsg.textContent = "No se pudo cargar la informacion del empleo.";
      errorMsg.classList.remove("d-none");
    }
  }
}

function renderJob(job) {
  const salMin  = job.salary_min ? `$${job.salary_min / 1000}k` : null;
  const salMax  = job.salary_max ? `$${job.salary_max / 1000}k` : null;
  const salario = salMin && salMax ? `${salMin} - ${salMax}` : salMin || salMax || "A convenir";

  document.getElementById("jobTitulo").textContent      = job.title || "Sin título";
  const company = companyMap.get(job.company_id);
  document.getElementById("jobEmpresa").textContent     = company?.name || "Empresa";
  document.getElementById("jobDescripcion").textContent = job.description || "Sin descripción";

  const badgeUbicacion   = document.getElementById("badgeUbicacion");
  const badgeSalario     = document.getElementById("badgeSalario");
  const badgeContrato    = document.getElementById("badgeContrato");
  const badgeExperiencia = document.getElementById("badgeExperiencia");

  job.location ? badgeUbicacion.textContent = job.location : badgeUbicacion.classList.add("d-none");
  salario ? badgeSalario.textContent = salario : badgeSalario.classList.add("d-none");

  if (job.contract_type) {
    badgeContrato.textContent = job.contract_type;
    badgeContrato.className   = `badge ${getBadgeContrato(job.contract_type)}`;
  } else {
    badgeContrato.classList.add("d-none");
  }

  job.experience_level ? badgeExperiencia.textContent = job.experience_level : badgeExperiencia.classList.add("d-none");
}

function renderEmpresa(companyId) {
  const company = companyMap.get(companyId) || null;

  const nombre = document.getElementById("empresaNombre");
  const sector = document.getElementById("empresaSector");
  const tamano = document.getElementById("empresaTamano");

  if (nombre) nombre.textContent = company?.name || "No disponible";
  if (sector) sector.textContent = company?.sector || "No disponible";
  if (tamano) tamano.textContent = company?.size || "No disponible";
}

async function verificarPostulacionExistente() {
  const btnPostularme = document.getElementById("btnPostularme");
  const msgPostulado = document.getElementById("msgPostulado");

  if (!sesionActiva?.user?.id || !jobActual?.id || !btnPostularme || !msgPostulado) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/applications`);
    if (!res.ok) {
      return;
    }

    const applications = await res.json();
    const yaPostulo = (applications || []).some((application) => {
      const candidateId = application.candidate_id || application.user_id;
      const jobPostId = application.job_post_id || application.job_id;
      return String(candidateId) === String(sesionActiva.user.id) && String(jobPostId) === String(jobActual.id);
    });

    if (yaPostulo) {
      btnPostularme.classList.add("d-none");
      msgPostulado.textContent = "Ya te postulaste a este empleo.";
      msgPostulado.classList.remove("d-none");
      return;
    }

    msgPostulado.classList.add("d-none");
    btnPostularme.classList.remove("d-none");
  } catch (error) {
    console.error("Error validando postulacion previa:", error);
  }
}

async function postularse() {
  if (!sesionActiva || !jobActual) return;

  const btnPostularme = document.getElementById("btnPostularme");
  const msgPostulado  = document.getElementById("msgPostulado");

  await verificarPostulacionExistente();
  if (btnPostularme.classList.contains("d-none")) {
    return;
  }

  btnPostularme.disabled = true;
  btnPostularme.textContent = "Enviando...";

  try {
    const res = await fetch(`${API_BASE}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_post_id: jobActual.id,
        candidate_id: sesionActiva.user.id,
        status: "pendiente",
      })
    });

    if (!res.ok) throw new Error("Error al postularse");

    btnPostularme.classList.add("d-none");
  btnPostularme.disabled = false;
  btnPostularme.textContent = "Postularme";
  msgPostulado.textContent = "Ya te postulaste a este empleo.";
    msgPostulado.classList.remove("d-none");

  } catch (err) {
    console.error(err);
    btnPostularme.disabled = false;
    btnPostularme.textContent = "Postularme";
  }
}

document.getElementById("btnPostularme").addEventListener("click", postularse);

actualizarNavbarAuth();
cargarJob();

supabaseClient.auth.onAuthStateChange(() => {
  actualizarNavbarAuth();
});