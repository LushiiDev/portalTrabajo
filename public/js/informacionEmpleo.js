const SUPABASE_URL = "https://unyqdgntdqwauzckzoky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vaV2z3ugubTKsqcbgk8prw_wTWQsXJS";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_BASE = "http://127.0.0.1:3000";

let sesionActiva = null;
let jobActual = null;
let companyMap = new Map();
let profilesById = new Map();
let companyReviews = [];
let currentCompanyId = null;
let currentUserReviewId = null;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeReviewStatus(status) {
  return String(status || "activa").trim().toLowerCase() || "activa";
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("es-SV", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function getReviewAuthorName(review) {
  const profile = profilesById.get(review?.user_id);
  return profile?.full_name || profile?.headline || "Usuario";
}

function renderStarMarkup(rating) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  let html = "";

  for (let index = 1; index <= 5; index += 1) {
    html += index <= safeRating ? '<i class="bi bi-star-fill me-1"></i>' : '<i class="bi bi-star me-1"></i>';
  }

  return html;
}

function setReviewRating(rating) {
  const nextRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const ratingInput = document.getElementById("reviewRating");
  const starButtons = document.querySelectorAll("#reviewStarsInput .review-star");

  if (ratingInput) {
    ratingInput.value = String(nextRating);
  }

  starButtons.forEach((button) => {
    const value = Number(button.dataset.rating || 0);
    const icon = button.querySelector("i");

    if (!icon) {
      return;
    }

    if (value <= nextRating) {
      icon.classList.remove("bi-star");
      icon.classList.add("bi-star-fill");
    } else {
      icon.classList.remove("bi-star-fill");
      icon.classList.add("bi-star");
    }
  });
}

function setupReviewStarControls() {
  const starButtons = document.querySelectorAll("#reviewStarsInput .review-star");

  starButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setReviewRating(Number(button.dataset.rating || 0));
    });
  });
}

function updateReviewAuthMessage() {
  const message = document.getElementById("reviewAuthMessage");
  if (!message) {
    return;
  }

  if (!sesionActiva) {
    message.className = "alert alert-light border small mb-3";
    message.innerHTML = 'Inicia sesión con una cuenta de usuario para valorar esta empresa. <a href="registroUsuario.html" class="alert-link">Entrar</a>';
    return;
  }

  const tipoCuenta = sesionActiva.user?.user_metadata?.tipo_cuenta || "usuario";
  if (tipoCuenta === "empresa") {
    message.className = "alert alert-warning small mb-3";
    message.textContent = "Las cuentas de empresa no pueden publicar valoraciones.";
    return;
  }

  message.className = "alert alert-light border small mb-3 d-none";
  message.textContent = "";
}

function syncReviewFormState() {
  const form = document.getElementById("companyReviewForm");
  const button = document.getElementById("submitReviewBtn");
  const commentInput = document.getElementById("reviewComment");
  const tipoCuenta = sesionActiva?.user?.user_metadata?.tipo_cuenta || "usuario";

  if (!form || !button || !commentInput) {
    return;
  }

  updateReviewAuthMessage();

  if (!sesionActiva || tipoCuenta === "empresa") {
    form.classList.add("d-none");
    setReviewRating(0);
    commentInput.value = "";
    button.textContent = "Publicar valoración";
    currentUserReviewId = null;
    return;
  }

  form.classList.remove("d-none");

  const existingReview = companyReviews.find((review) => {
    return String(review.user_id) === String(sesionActiva.user.id) && normalizeReviewStatus(review.status) !== "eliminada";
  });

  currentUserReviewId = existingReview?.id || null;

  if (existingReview) {
    setReviewRating(existingReview.rating || 0);
    commentInput.value = existingReview.comment || "";
    button.textContent = "Actualizar valoración";
    return;
  }

  setReviewRating(0);
  commentInput.value = "";
  button.textContent = "Publicar valoración";
}

function renderCompanyReviews() {
  const list = document.getElementById("companyReviewsList");
  const summaryText = document.getElementById("reviewsSummaryText");
  const averageRating = document.getElementById("companyAverageRating");
  const countLabel = document.getElementById("companyReviewsCount");

  if (!list) {
    return;
  }

  const activeReviews = companyReviews.filter((review) => normalizeReviewStatus(review.status) !== "eliminada");
  const reviewCount = activeReviews.length;
  const average = reviewCount
    ? activeReviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / reviewCount
    : 0;

  if (averageRating) {
    averageRating.textContent = reviewCount ? `${average.toFixed(1)}/5` : "-";
  }

  if (countLabel) {
    countLabel.textContent = `${reviewCount} review${reviewCount === 1 ? "" : "s"}`;
  }

  if (summaryText) {
    summaryText.textContent = reviewCount
      ? `Basado en ${reviewCount} valoración${reviewCount === 1 ? "" : "es"} de personas que han interactuado con la empresa.`
      : "Aun no hay valoraciones para esta empresa.";
  }

  list.innerHTML = "";

  if (!reviewCount) {
    const emptyState = document.createElement("p");
    emptyState.className = "text-muted mb-0";
    emptyState.textContent = "Sé la primera persona en valorar esta empresa.";
    list.appendChild(emptyState);
    syncReviewFormState();
    return;
  }

  activeReviews.forEach((review) => {
    const card = document.createElement("div");
    card.className = "border rounded-3 p-3 bg-light";

    const author = escapeHtml(getReviewAuthorName(review));
    const comment = escapeHtml(review.comment || "").replace(/\n/g, "<br>");
    const dateLabel = formatDateTime(review.created_at);

    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
        <div>
          <div class="fw-semibold">${author}</div>
          <div class="text-warning small">${renderStarMarkup(review.rating)}</div>
        </div>
        <div class="text-muted small text-nowrap">${escapeHtml(dateLabel)}</div>
      </div>
      <p class="mb-0 text-muted small">${comment || "Sin comentario."}</p>
    `;

    list.appendChild(card);
  });

  syncReviewFormState();
}

async function loadCompanyReviews(companyId) {
  currentCompanyId = companyId;

  try {
    const [profilesResponse, reviewsResponse] = await Promise.all([
      fetch(`${API_BASE}/api/profiles`),
      fetch(`${API_BASE}/reviews?company_id=${encodeURIComponent(companyId)}&status=activa`),
    ]);

    const profiles = profilesResponse.ok ? await profilesResponse.json() : [];
    const reviews = reviewsResponse.ok ? await reviewsResponse.json() : [];

    profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    companyReviews = Array.isArray(reviews) ? reviews : [];
  } catch (error) {
    console.error("Error cargando reviews de empresa:", error);
    companyReviews = [];
    profilesById = new Map();
  }

  renderCompanyReviews();
}

async function actualizarNavbarAuth() {
  const authActions = document.getElementById("authActions");
  const userMenu = document.getElementById("userMenu");
  const userEmailLabel = document.getElementById("userEmailLabel");
  const logoutBtn = document.getElementById("logoutBtn");
  const profileIcon = userMenu?.querySelector(".dropdown-menu .bi-person");
  const profileLink = profileIcon ? profileIcon.closest("a.dropdown-item") : null;

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
  syncReviewFormState();
}

async function mostrarBotonPostular() {
  const btnPostularme = document.getElementById("btnPostularme");
  const btnLoginParaPostular = document.getElementById("btnLoginParaPostular");
  const msgPostulado = document.getElementById("msgPostulado");

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
  if (tipo.includes("full")) return "bg-primary";
  if (tipo.includes("part")) return "bg-info text-dark";
  if (tipo.includes("remote")) return "bg-success";
  return "bg-secondary";
}

async function cargarJob() {
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("id") || sessionStorage.getItem("jobId");
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
    jobActual = jobs.find((job) => String(job.id) === String(jobId));
    if (!jobActual) {
      throw new Error("Vacante no encontrada");
    }

    renderJob(jobActual);
    renderEmpresa(jobActual.company_id);
    await loadCompanyReviews(jobActual.company_id);
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
  const salMin = formatSalaryValue(job.salary_min);
  const salMax = formatSalaryValue(job.salary_max);
  const salario = salMin && salMax ? `${salMin} - ${salMax}` : salMin || salMax || "A convenir";

  document.getElementById("jobTitulo").textContent = job.title || "Sin título";
  const company = companyMap.get(job.company_id);
  document.getElementById("jobEmpresa").textContent = company?.name || "Empresa";
  document.getElementById("jobDescripcion").textContent = job.description || "Sin descripción";

  const badgeUbicacion = document.getElementById("badgeUbicacion");
  const badgeSalario = document.getElementById("badgeSalario");
  const badgeContrato = document.getElementById("badgeContrato");
  const badgeExperiencia = document.getElementById("badgeExperiencia");

  job.location ? (badgeUbicacion.textContent = job.location) : badgeUbicacion.classList.add("d-none");
  salario ? (badgeSalario.textContent = salario) : badgeSalario.classList.add("d-none");

  if (job.contract_type) {
    badgeContrato.textContent = job.contract_type;
    badgeContrato.className = `badge ${getBadgeContrato(job.contract_type)}`;
  } else {
    badgeContrato.classList.add("d-none");
  }

  job.experience_level ? (badgeExperiencia.textContent = job.experience_level) : badgeExperiencia.classList.add("d-none");
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
  const msgPostulado = document.getElementById("msgPostulado");

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
      }),
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

function setupReviewForm() {
  const form = document.getElementById("companyReviewForm");
  const commentInput = document.getElementById("reviewComment");

  if (!form || !commentInput) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!sesionActiva) {
      alert("Debes iniciar sesión para publicar una valoración.");
      return;
    }

    const tipoCuenta = sesionActiva.user?.user_metadata?.tipo_cuenta || "usuario";
    if (tipoCuenta === "empresa") {
      alert("Las cuentas de empresa no pueden publicar valoraciones.");
      return;
    }

    const rating = Number(document.getElementById("reviewRating")?.value || 0);
    const comment = commentInput.value.trim();

    if (!currentCompanyId) {
      alert("No se pudo identificar la empresa.");
      return;
    }

    if (!rating || rating < 1 || rating > 5) {
      alert("Selecciona una calificación entre 1 y 5 estrellas.");
      return;
    }

    if (comment.length < 10) {
      alert("Escribe un comentario de al menos 10 caracteres.");
      return;
    }

    const submitBtn = document.getElementById("submitReviewBtn");
    const originalLabel = submitBtn?.textContent || "Publicar valoración";
    let savedSuccessfully = false;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = currentUserReviewId ? "Actualizando..." : "Publicando...";
    }

    try {
      const payload = {
        company_id: currentCompanyId,
        user_id: sesionActiva.user.id,
        rating,
        comment,
        status: "activa",
      };

      const response = currentUserReviewId
        ? await fetch(`${API_BASE}/reviews/${currentUserReviewId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`${API_BASE}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        throw new Error("No se pudo guardar la valoración.");
      }

      commentInput.value = "";
      setReviewRating(0);

      await loadCompanyReviews(currentCompanyId);
      savedSuccessfully = true;
      alert("Valoración publicada correctamente.");
    } catch (error) {
      console.error("Error guardando review:", error);
      alert(error.message || "No se pudo guardar la valoración.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (!savedSuccessfully) {
          submitBtn.textContent = originalLabel;
        }
      }
    }
  });
}

document.getElementById("btnPostularme").addEventListener("click", postularse);
setupReviewStarControls();
setupReviewForm();

actualizarNavbarAuth();
cargarJob();

supabaseClient.auth.onAuthStateChange(() => {
  actualizarNavbarAuth();
});