let sessionUser = null;
let currentCompany = null;
let selectedLogoFile = null;

function formatMonthYear(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function getCompletenessScore(company) {
  const fields = [
    company?.name,
    company?.description,
    company?.sector,
    company?.size,
    company?.founded_year,
    company?.website,
    company?.location,
    company?.NIT,
  ];

  const completed = fields.filter((value) => String(value || "").trim() !== "").length;
  return Math.round((completed / fields.length) * 100);
}

function setVerificationLabel(element, verified) {
  if (!element) return;
  if (verified) {
    element.className = "small text-success fw-medium";
    element.innerHTML = '<i class="bi bi-check2 me-1"></i>Verificado';
    return;
  }

  element.className = "small text-warning fw-medium";
  element.innerHTML = '<i class="bi bi-exclamation-circle me-1"></i>Pendiente';
}

function fillCompanyForm(company) {
  const mappings = [
    ["companyName", company?.name || ""],
    ["companySector", company?.sector || ""],
    ["companySize", company?.size || ""],
    ["companyFoundedYear", company?.founded_year || ""],
    ["companyNIT", company?.NIT || ""],
    ["companyDescription", company?.description || ""],
    ["companyWebsite", company?.website || ""],
    ["companyLinkedIn", company?.linkedin_url || ""],
    ["companyFacebook", company?.facebook_url || ""],
    ["companyLocation", company?.location || ""],
  ];

  mappings.forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });

  const emailInput = document.getElementById("companyEmail");
  if (emailInput) {
    emailInput.value = sessionUser?.email || "";
  }

  const preview = document.getElementById("companyLogoPreview");
  const statusLabel = document.getElementById("companyLogoStatus");
  if (preview) {
    preview.src = company?.logo_url || "https://placehold.co/120x120?text=Logo";
  }

  if (statusLabel) {
    statusLabel.textContent = company?.logo_url ? "Logo cargado." : "Aun no has subido logo.";
  }
}

function getFileExtension(fileName) {
  const parts = String(fileName || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "png";
}

async function uploadCompanyLogo() {
  if (!selectedLogoFile) {
    alert("Selecciona una imagen para subir.");
    return;
  }

  if (!sessionUser?.id || !currentCompany?.id) {
    alert("No se encontro una sesion valida para subir el logo.");
    return;
  }

  const uploadBtn = document.getElementById("uploadLogoBtn");
  const statusLabel = document.getElementById("companyLogoStatus");

  const extension = getFileExtension(selectedLogoFile.name);
  const filePath = `${sessionUser.id}/logo.${extension}`;

  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Subiendo...";
  }

  if (statusLabel) {
    statusLabel.className = "small text-muted mb-0";
    statusLabel.textContent = "Subiendo logo...";
  }

  try {
    const { error: uploadError } = await supabaseClient.storage
      .from("logo")
      .upload(filePath, selectedLogoFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: selectedLogoFile.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = supabaseClient.storage
      .from("logo")
      .getPublicUrl(filePath);

    const logoUrl = publicData?.publicUrl || "";
    if (!logoUrl) {
      throw new Error("No se pudo generar la URL publica del logo.");
    }

    const payload = getCompanyPayloadFromForm();
    payload.logo_url = logoUrl;

    const updated = await actualizarDatosEmpresa(currentCompany.id, payload);
    if (!updated) {
      throw new Error("No se pudo guardar el logo en la empresa.");
    }

    currentCompany = updated;
    fillCompanyForm(currentCompany);
    updateCompletenessUI(currentCompany);

    if (statusLabel) {
      statusLabel.className = "small text-success mb-0";
      statusLabel.textContent = "Logo subido y guardado correctamente.";
    }
  } catch (error) {
    console.error("Error subiendo logo:", error);
    if (statusLabel) {
      statusLabel.className = "small text-danger mb-0";
      statusLabel.textContent = "No se pudo subir el logo.";
    }
    alert("Error al subir el logo. Verifica el formato o las politicas del bucket.");
  } finally {
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Subir Logo";
    }
  }
}

function updateCompletenessUI(company) {
  const score = getCompletenessScore(company);
  const label = document.getElementById("profileCompletenessLabel");
  const bar = document.getElementById("profileCompletenessBar");

  if (label) label.textContent = `${score}%`;
  if (bar) {
    bar.style.width = `${score}%`;
    bar.setAttribute("aria-valuenow", String(score));
  }
}

async function renderStats(companyId) {
  try {
    const [jobsResponse, appsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/jobs`),
      fetch(`${API_BASE_URL}/applications`),
    ]);

    const jobs = jobsResponse.ok ? await jobsResponse.json() : [];
    const applications = appsResponse.ok ? await appsResponse.json() : [];

    const companyJobs = (jobs || []).filter((job) => job.company_id === companyId);
    const jobIds = new Set(companyJobs.map((job) => job.id));
    const totalApplicants = (applications || []).filter((app) => jobIds.has(app.job_post_id)).length;

    const jobsPublished = document.getElementById("statsJobsPublished");
    const applicants = document.getElementById("statsApplicants");

    if (jobsPublished) jobsPublished.textContent = String(companyJobs.length);
    if (applicants) applicants.textContent = String(totalApplicants);
  } catch (error) {
    console.error("Error cargando estadisticas de empresa:", error);
  }
}

function updateVerificationUI(company) {
  const emailVerification = document.getElementById("emailVerification");
  const companyVerification = document.getElementById("companyVerification");
  const memberSince = document.getElementById("statsMemberSince");

  const emailVerified = Boolean(sessionUser?.email_confirmed_at);
  const companyVerified = Boolean(company?.name && company?.NIT);

  setVerificationLabel(emailVerification, emailVerified);
  setVerificationLabel(companyVerification, companyVerified);

  if (memberSince) {
    memberSince.textContent = formatMonthYear(company?.created_at || sessionUser?.created_at);
  }
}

function getCompanyPayloadFromForm() {
  const name = (document.getElementById("companyName")?.value || "").trim();
  const sector = (document.getElementById("companySector")?.value || "").trim();
  const size = (document.getElementById("companySize")?.value || "").trim();
  const foundedYearRaw = (document.getElementById("companyFoundedYear")?.value || "").trim();
  const NIT = (document.getElementById("companyNIT")?.value || "").trim();
  const description = (document.getElementById("companyDescription")?.value || "").trim();
  const website = (document.getElementById("companyWebsite")?.value || "").trim();
  const linkedin_url = (document.getElementById("companyLinkedIn")?.value || "").trim();
  const facebook_url = (document.getElementById("companyFacebook")?.value || "").trim();
  const location = (document.getElementById("companyLocation")?.value || "").trim();

  const founded_year = foundedYearRaw ? Number(foundedYearRaw) : null;

  return {
    name,
    sector,
    size,
    founded_year: Number.isNaN(founded_year) ? null : founded_year,
    NIT,
    description,
    website,
    linkedin_url,
    facebook_url,
    location,
    user_id: sessionUser?.id || null,
    logo_url: currentCompany?.logo_url || "",
  };
}

function setupActions() {
  const form = document.getElementById("companyProfileForm");
  const resetBtn = document.getElementById("resetCompanyBtn");
  const completeBtn = document.getElementById("completeProfileBtn");
  const logoInput = document.getElementById("companyLogoFile");
  const uploadLogoBtn = document.getElementById("uploadLogoBtn");
  const logoPreview = document.getElementById("companyLogoPreview");

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      fillCompanyForm(currentCompany);
      selectedLogoFile = null;
      if (logoInput) {
        logoInput.value = "";
      }
    });
  }

  if (logoInput) {
    logoInput.addEventListener("change", () => {
      const file = logoInput.files?.[0] || null;
      selectedLogoFile = file;

      if (!file) return;

      if (logoPreview) {
        logoPreview.src = URL.createObjectURL(file);
      }
    });
  }

  if (uploadLogoBtn) {
    uploadLogoBtn.addEventListener("click", async () => {
      await uploadCompanyLogo();
    });
  }

  if (completeBtn) {
    completeBtn.addEventListener("click", () => {
      const firstEmpty = [
        "companyName",
        "companySector",
        "companySize",
        "companyNIT",
        "companyWebsite",
        "companyLocation",
      ]
        .map((id) => document.getElementById(id))
        .find((input) => input && !(input.value || "").trim());

      if (firstEmpty) {
        firstEmpty.focus();
      }
    });
  }

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const saveBtn = document.getElementById("saveCompanyBtn");
    const payload = getCompanyPayloadFromForm();

    if (!payload.name) {
      alert("El nombre de la empresa es obligatorio.");
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Guardando...";
    }

    try {
      const updated = await actualizarDatosEmpresa(currentCompany.id, payload);
      if (!updated) {
        alert("No se pudo guardar la informacion de la empresa.");
        return;
      }

      currentCompany = updated;
      fillCompanyForm(currentCompany);
      updateVerificationUI(currentCompany);
      updateCompletenessUI(currentCompany);
      alert("Perfil de empresa actualizado correctamente.");
    } catch (error) {
      console.error("Error actualizando perfil de empresa:", error);
      alert("Ocurrio un error al actualizar el perfil.");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Guardar cambios";
      }
    }
  });
}

async function initPerfilEmpresaPage() {
  const session = await verificarSesionEmpresa();
  if (!session) return;

  sessionUser = session.user;
  currentCompany = await obtenerDatosEmpresa(session.user.id);

  if (!currentCompany?.id) {
    alert("No encontramos una empresa asociada a esta cuenta.");
    window.location.href = "./registroUsuario.html";
    return;
  }

  fillCompanyForm(currentCompany);
  updateVerificationUI(currentCompany);
  updateCompletenessUI(currentCompany);
  setupActions();
  await renderStats(currentCompany.id);
}

document.addEventListener("DOMContentLoaded", initPerfilEmpresaPage);
