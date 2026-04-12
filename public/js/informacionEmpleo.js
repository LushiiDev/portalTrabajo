const SUPABASE_URL = "https://unyqdgntdqwauzckzoky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vaV2z3ugubTKsqcbgk8prw_wTWQsXJS";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_BASE = "http://localhost:3000";

let sesionActiva = null;
let jobActual = null;

async function actualizarNavbarAuth() {
  const authActions    = document.getElementById("authActions");
  const userMenu       = document.getElementById("userMenu");
  const userEmailLabel = document.getElementById("userEmailLabel");
  const logoutBtn      = document.getElementById("logoutBtn");

  const { data, error } = await supabaseClient.auth.getSession();
  const session = data?.session;
  sesionActiva = session || null;

  if (error || !session) {
    authActions.classList.remove("d-none");
    userMenu.classList.add("d-none");
  } else {
    authActions.classList.add("d-none");
    userMenu.classList.remove("d-none");
    if (userEmailLabel) userEmailLabel.textContent = session.user?.email || "Usuario";
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabaseClient.auth.signOut();
      window.location.reload();
    };
  }

  mostrarBotonPostular();
}

function mostrarBotonPostular() {
  const btnPostularme        = document.getElementById("btnPostularme");
  const btnLoginParaPostular = document.getElementById("btnLoginParaPostular");

  if (sesionActiva) {
    btnPostularme.classList.remove("d-none");
    btnLoginParaPostular.classList.add("d-none");
  } else {
    btnPostularme.classList.add("d-none");
    btnLoginParaPostular.classList.remove("d-none");
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

  if (!jobId) return;

  try {
    const res = await fetch(`${API_BASE}/jobs`);
    if (!res.ok) throw new Error("Error al obtener trabajos");
    const jobs = await res.json();
    jobActual = jobs.find(j => String(j.id) === String(jobId));
    if (jobActual) renderJob(jobActual);
  } catch (err) {
    console.error(err);
  }
}

function renderJob(job) {
  const salMin  = job.salary_min ? `$${job.salary_min / 1000}k` : null;
  const salMax  = job.salary_max ? `$${job.salary_max / 1000}k` : null;
  const salario = salMin && salMax ? `${salMin} - ${salMax}` : salMin || salMax || "A convenir";

  document.getElementById("jobTitulo").textContent      = job.title || "Sin título";
  document.getElementById("jobEmpresa").textContent     = "ChambaHub";
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

async function postularse() {
  if (!sesionActiva || !jobActual) return;

  const btnPostularme = document.getElementById("btnPostularme");
  const msgPostulado  = document.getElementById("msgPostulado");

  btnPostularme.disabled = true;
  btnPostularme.textContent = "Enviando...";

  try {
    const res = await fetch(`${API_BASE}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobActual.id, user_id: sesionActiva.user.id })
    });

    if (!res.ok) throw new Error("Error al postularse");

    btnPostularme.classList.add("d-none");
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