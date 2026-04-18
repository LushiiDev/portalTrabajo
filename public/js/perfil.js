const SUPABASE_URL = "https://unyqdgntdqwauzckzoky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vaV2z3ugubTKsqcbgk8prw_wTWQsXJS";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
if (typeof API_BASE_URL === 'undefined') {
  var API_BASE_URL = "http://127.0.0.1:3000";
}

const ACTIVE_TAB_KEY = "perfilActiveTabId";

let currentUser = null;
let currentProfile = null;
let currentCvObjectUrl = null;
let selectedCvFile = null;
let selectedAvatarFile = null;
let selectedAvatarPreviewUrl = null;
let profileSkills = [];

let alertKeywords = [];
let alertRows = [];
let availableJobs = [];

const profileForm = document.getElementById("profileForm");
const headlineInput = document.getElementById("headline");
const biografiaInput = document.getElementById("biografia");
const ubicacionInput = document.getElementById("ubicacion");

const profileNameHeader = document.getElementById("profileNameHeader");
const profileHeadlineHeader = document.getElementById("profileHeadlineHeader");
const profileRoleBadge = document.getElementById("profileRoleBadge");
const chooseAvatarBtn = document.getElementById("chooseAvatarBtn");
const avatarFileInput = document.getElementById("avatarFileInput");
const profileAvatarImage = document.getElementById("profileAvatarImage");
const profileAvatarFallback = document.getElementById("profileAvatarFallback");
const skillsContainer = document.getElementById("skillsContainer");
const habilidadesInput = document.getElementById("habilidades");
const addSkillBtn = document.getElementById("addSkillBtn");

const cvFileInput = document.getElementById("cvFileInput");
const cvPreviewFrame = document.getElementById("cvPreviewFrame");
const emptyCvState = document.getElementById("emptyCvState");
const uploadCvBtn = document.getElementById("uploadCvBtn");
const cvUploadMessage = document.getElementById("cvUploadMessage");
const openCvLink = document.getElementById("openCvLink");

const applicationsTableBody = document.getElementById("applicationsTableBody");
const applicationCountBadge = document.getElementById("applicationCountBadge");

const keywordInput = document.getElementById("keywordInput");
const addKeywordBtn = document.getElementById("addKeywordBtn");
const keywordsContainer = document.getElementById("keywordsContainer");
const jobsAlertsList = document.getElementById("jobsAlertsList");
const alertsEmptyState = document.getElementById("alertsEmptyState");
const matchCountBadge = document.getElementById("matchCountBadge");

document.addEventListener("DOMContentLoaded", initPerfilPage);

async function initPerfilPage() {
	setupTabPersistence();
	setupEventListeners();

	const session = await requireSession();
	if (!session) {
		return;
	}

	currentUser = session.user;
	setupNavbarForSession(session);

	await Promise.all([loadProfile(), loadApplications(), loadAlertsAndJobs()]);

	renderKeywords();
	renderSuggestedJobs();
}

async function requireSession() {
	const { data, error } = await supabaseClient.auth.getSession();
	if (error || !data?.session) {
		window.location.href = "./registroUsuario.html";
		return null;
	}

	return data.session;
}

async function apiFetchJson(path, options = {}) {
	const response = await fetch(API_BASE_URL + path, {
		headers: {
			"Content-Type": "application/json",
			...(options.headers || {}),
		},
		...options,
	});

	let payload = null;
	try {
		payload = await response.json();
	} catch (error) {
		payload = null;
	}

	if (!response.ok) {
		throw new Error(payload?.message || "Error en API");
	}

	return payload;
}

function setupNavbarForSession(session) {
	const authActions = document.getElementById("authActions");
	const userMenu = document.getElementById("userMenu");
	const userEmailLabel = document.getElementById("userEmailLabel");
	const logoutBtn = document.getElementById("logoutBtn");
	const profileIcon = userMenu?.querySelector(".dropdown-menu .bi-person");
	const profileLink = profileIcon ? profileIcon.closest("a.dropdown-item") : null;
	const settingsIcon = userMenu?.querySelector(".dropdown-menu .bi-gear");
	const settingsLink = settingsIcon ? settingsIcon.closest("a.dropdown-item") : null;

	const meta = session.user?.user_metadata || {};
	const tipoCuenta = meta.tipo_cuenta || "usuario";
	const userLabel = meta.nombre_empresa || meta.nombre || session.user?.email || "Usuario";

	if (authActions) {
		authActions.classList.add("d-none");
	}

	if (userMenu) {
		userMenu.classList.remove("d-none");
	}

	if (userEmailLabel) {
		userEmailLabel.textContent = userLabel;
	}

	if (profileLink) {
		profileLink.href = tipoCuenta === "empresa" ? "./dashBoardEmpresa.html" : "./perfil.html";
	}

	if (settingsLink) {
		settingsLink.href = tipoCuenta === "empresa" ? "./perfilEmpresa.html" : "./perfil.html#perfil-pane";
	}

	if (logoutBtn) {
		logoutBtn.onclick = async function () {
			await supabaseClient.auth.signOut();
			window.location.href = "./registroUsuario.html";
		};
	}
}

function setupTabPersistence() {
	const tabButtons = document.querySelectorAll("#perfilTabs button[data-bs-toggle='tab']");

	tabButtons.forEach(function (button) {
		button.addEventListener("shown.bs.tab", function () {
			localStorage.setItem(ACTIVE_TAB_KEY, button.id);
		});
	});

	const savedTabId = localStorage.getItem(ACTIVE_TAB_KEY);
	if (!savedTabId) {
		return;
	}

	const savedTabButton = document.getElementById(savedTabId);
	if (savedTabButton && window.bootstrap?.Tab) {
		window.bootstrap.Tab.getOrCreateInstance(savedTabButton).show();
	}
}

function setupEventListeners() {
	if (profileForm) {
		profileForm.addEventListener("submit", onProfileSubmit);
	}

	if (cvFileInput) {
		cvFileInput.addEventListener("change", onCvFileChange);
	}

	if (uploadCvBtn) {
		uploadCvBtn.addEventListener("click", onUploadCvClick);
	}

	if (addKeywordBtn) {
		addKeywordBtn.addEventListener("click", onAddKeywordClick);
	}

	if (keywordInput) {
		keywordInput.addEventListener("keydown", function (event) {
			if (event.key === "Enter") {
				event.preventDefault();
				onAddKeywordClick();
			}
		});
	}

	if (chooseAvatarBtn && avatarFileInput) {
		chooseAvatarBtn.addEventListener("click", function () {
			avatarFileInput.click();
		});

		avatarFileInput.addEventListener("change", onAvatarInputChange);
	}

	if (addSkillBtn) {
		addSkillBtn.addEventListener("click", onAddSkillClick);
	}

	if (habilidadesInput) {
		habilidadesInput.addEventListener("keydown", function (event) {
			if (event.key === "Enter") {
				event.preventDefault();
				onAddSkillClick();
			}
		});
	}

	if (headlineInput && profileHeadlineHeader) {
		headlineInput.addEventListener("input", function () {
			profileHeadlineHeader.textContent = headlineInput.value.trim() || "Completa tu perfil profesional";
		});
	}
}

function isMissingColumnError(error) {
	if (!error) {
		return false;
	}

	const code = error.code || "";
	const message = (error.message || "").toLowerCase();
	return code === "42703" || code === "PGRST204" || message.includes("column");
}

async function fetchRowsByUser(tableName, userColumns, orderColumn = "created_at") {
	for (const columnName of userColumns) {
		const { data, error } = await supabaseClient
			.from(tableName)
			.select("*")
			.eq(columnName, currentUser.id)
			.order(orderColumn, { ascending: false });

		if (!error) {
			return data || [];
		}

		if (!isMissingColumnError(error)) {
			throw error;
		}
	}

	return [];
}

function getMetadataFullName() {
	const nombre = currentUser?.user_metadata?.nombre || "";
	const apellido = currentUser?.user_metadata?.apellido || "";
	const fromMetadata = (nombre + " " + apellido).trim();
	if (fromMetadata) {
		return fromMetadata;
	}

	if (currentUser?.email) {
		return currentUser.email.split("@")[0];
	}

	return "Usuario";
}

function getSkillsStorageKey() {
	if (!currentUser?.id) {
		return "profileSkills";
	}

	return "profileSkills:" + currentUser.id;
}

function parseSkills(rawSkills) {
	if (Array.isArray(rawSkills)) {
		return Array.from(new Set(rawSkills.map(function (item) {
			return String(item || "").trim();
		}).filter(Boolean)));
	}

	if (typeof rawSkills === "string") {
		return Array.from(new Set(rawSkills
			.split(",")
			.map(function (item) {
				return item.trim();
			})
			.filter(Boolean)));
	}

	return [];
}

function loadSkillsFromLocalStorage() {
	const storageKey = getSkillsStorageKey();
	const rawValue = localStorage.getItem(storageKey);
	if (!rawValue) {
		return [];
	}

	try {
		return parseSkills(JSON.parse(rawValue));
	} catch (error) {
		return parseSkills(rawValue);
	}
}

function persistSkills() {
	const storageKey = getSkillsStorageKey();
	localStorage.setItem(storageKey, JSON.stringify(profileSkills));
}

function renderProfileAvatar(avatarUrl) {
	if (!profileAvatarImage || !profileAvatarFallback) {
		return;
	}

	if (avatarUrl) {
		profileAvatarImage.src = avatarUrl;
		profileAvatarImage.classList.remove("d-none");
		profileAvatarFallback.classList.add("d-none");
		return;
	}

	profileAvatarImage.classList.add("d-none");
	profileAvatarFallback.classList.remove("d-none");
}

function renderSkills() {
	if (!skillsContainer) {
		return;
	}

	skillsContainer.innerHTML = "";

	if (!profileSkills.length) {
		const hint = document.createElement("span");
		hint.className = "text-muted small";
		hint.textContent = "Agrega habilidades para destacar tu perfil.";
		skillsContainer.appendChild(hint);
		return;
	}

	profileSkills.forEach(function (skill) {
		const badge = document.createElement("span");
		badge.className = "badge text-bg-primary d-inline-flex align-items-center gap-2";
		badge.innerHTML =
			'<span>' + skill + '</span><button type="button" class="btn-close btn-close-white" aria-label="Eliminar habilidad"></button>';

		badge.querySelector("button").addEventListener("click", function () {
			profileSkills = profileSkills.filter(function (item) {
				return item !== skill;
			});
			persistSkills();
			renderSkills();
		});

		skillsContainer.appendChild(badge);
	});
}

function onAddSkillClick() {
	const rawSkill = habilidadesInput?.value || "";
	const normalizedSkill = rawSkill.trim();
	if (!normalizedSkill) {
		return;
	}

	const exists = profileSkills.some(function (item) {
		return item.toLowerCase() === normalizedSkill.toLowerCase();
	});

	if (exists) {
		habilidadesInput.value = "";
		return;
	}

	profileSkills.push(normalizedSkill);
	persistSkills();
	renderSkills();
	habilidadesInput.value = "";
}

function onAvatarInputChange(event) {
	const file = event.target.files?.[0];
	if (!file) {
		return;
	}

	if (!file.type.startsWith("image/")) {
		alert("Selecciona una imagen valida.");
		avatarFileInput.value = "";
		return;
	}

	selectedAvatarFile = file;
	selectedAvatarPreviewUrl = URL.createObjectURL(file);
	renderProfileAvatar(selectedAvatarPreviewUrl);
}

async function loadProfile() {
	try {
		currentProfile = await apiFetchJson("/api/profiles/" + currentUser.id);
	} catch (error) {
		currentProfile = null;
	}

	applyProfileToUI(currentProfile);
}

function applyProfileToUI(profile) {
	const fullName = profile?.full_name || getMetadataFullName();
	const headline = profile?.headline || "Completa tu perfil profesional";
	const role = profile?.role || "Candidato";
	const profileAvatar = selectedAvatarPreviewUrl || profile?.avatar_url || "";

	if (profileNameHeader) {
		profileNameHeader.textContent = fullName;
	}

	if (profileHeadlineHeader) {
		profileHeadlineHeader.textContent = headline;
	}

	if (profileRoleBadge) {
		profileRoleBadge.textContent = role;
	}

	if (headlineInput) {
		headlineInput.value = profile?.headline || "";
	}

	renderProfileAvatar(profileAvatar);

	const incomingSkills = parseSkills(profile?.skills);
	if (incomingSkills.length) {
		profileSkills = incomingSkills;
		persistSkills();
	} else {
		profileSkills = loadSkillsFromLocalStorage();
	}
	renderSkills();

	if (biografiaInput) {
		biografiaInput.value = profile?.bio || "";
	}

	if (ubicacionInput && profile?.location) {
		const hasOption = Array.from(ubicacionInput.options).some(function (option) {
			return option.textContent.toLowerCase() === String(profile.location).toLowerCase();
		});

		if (!hasOption) {
			const option = document.createElement("option");
			option.value = profile.location;
			option.textContent = profile.location;
			ubicacionInput.appendChild(option);
		}

		ubicacionInput.value = profile.location;
	}

	if (profile?.cv_url) {
		setCvPreview(profile.cv_url, isPdfUrl(profile.cv_url));
	}
}

async function onProfileSubmit(event) {
	event.preventDefault();

	try {
		let avatarUrl = currentProfile?.avatar_url || null;
		if (selectedAvatarFile) {
			const uploadedAvatarUrl = await uploadAvatarToStorage(selectedAvatarFile);
			if (!uploadedAvatarUrl) {
				throw new Error("No se obtuvo URL publica para el avatar");
			}

			avatarUrl = uploadedAvatarUrl;
			selectedAvatarFile = null;
			selectedAvatarPreviewUrl = uploadedAvatarUrl;
			if (avatarFileInput) {
				avatarFileInput.value = "";
			}
		}

		const updates = {
			id: currentUser.id,
			full_name: currentProfile?.full_name || getMetadataFullName(),
			headline: headlineInput?.value?.trim() || "",
			bio: biografiaInput?.value?.trim() || "",
			location: ubicacionInput?.value || null,
			avatar_url: avatarUrl,
			skills: profileSkills,
			cv_url: currentProfile?.cv_url || null,
			role: currentProfile?.role || "Candidato",
		};

		if (currentProfile?.id) {
			currentProfile = await apiFetchJson("/api/profiles/" + currentUser.id, {
				method: "PUT",
				body: JSON.stringify(updates),
			});
		} else {
			currentProfile = await apiFetchJson("/api/profiles", {
				method: "POST",
				body: JSON.stringify(updates),
			});
		}

		if (!currentProfile?.skills) {
			currentProfile = {
				...(currentProfile || {}),
				skills: profileSkills,
			};
		}

		persistSkills();
		selectedAvatarPreviewUrl = currentProfile?.avatar_url || selectedAvatarPreviewUrl;
		applyProfileToUI(currentProfile);
		alert("Perfil guardado correctamente.");
	} catch (error) {
		console.error(error);
		alert("No se pudo guardar el perfil en Supabase.");
	}
}

function mapStatusBadgeClass(statusValue) {
	const normalized = String(statusValue || "").toLowerCase();

	if (normalized.includes("acept")) {
		return "success";
	}

	if (normalized.includes("rechaz")) {
		return "danger";
	}

	if (normalized.includes("entrev")) {
		return "primary";
	}

	if (normalized.includes("revision") || normalized.includes("pendiente")) {
		return "warning";
	}

	return "secondary";
}

function formatApplicationStatus(statusValue) {
	const normalized = String(statusValue || "pendiente").trim().toLowerCase();

	if (normalized === "en_revision") {
		return "En revision";
	}

	if (normalized === "aceptado") {
		return "Aceptado";
	}

	if (normalized === "rechazado") {
		return "Rechazado";
	}

	if (normalized === "entrevista") {
		return "Entrevista";
	}

	if (normalized === "pendiente") {
		return "Pendiente";
	}

	return normalized
		.replace(/_/g, " ")
		.split(" ")
		.filter(Boolean)
		.map(function (part) {
			return part.charAt(0).toUpperCase() + part.slice(1);
		})
		.join(" ");
}

function formatDate(dateValue) {
	if (!dateValue) {
		return "-";
	}

	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) {
		return "-";
	}

	return date.toLocaleDateString("es-SV");
}

function renderApplications(rows) {
	if (!applicationsTableBody) {
		return;
	}

	applicationsTableBody.innerHTML = "";

	if (applicationCountBadge) {
		applicationCountBadge.textContent = rows.length + " registradas";
	}

	if (!rows.length) {
		const emptyRow = document.createElement("tr");
		emptyRow.innerHTML = '<td colspan="5" class="text-center text-muted py-4">No tienes postulaciones registradas.</td>';
		applicationsTableBody.appendChild(emptyRow);
		return;
	}

	rows.forEach(function (application, index) {
		const row = document.createElement("tr");
		const jobData = Array.isArray(application.job_posts) ? application.job_posts[0] : application.job_posts;
		const title = jobData?.title || application.job_title || application.title || application.position || "Postulacion " + (index + 1);
		const company = jobData?.company_name || application.company_name || application.company || "No disponible";
		const date = formatDate(application.applied_at || application.created_at || application.application_date);
		const modality = jobData?.contract_type || application.modality || application.contract_type || "-";
		const status = application.status || "pendiente";
		const badgeClass = mapStatusBadgeClass(status);
		const statusLabel = formatApplicationStatus(status);

		row.innerHTML =
			"<td>" + title + "</td>" +
			"<td>" + company + "</td>" +
			"<td>" + date + "</td>" +
			"<td>" + modality + "</td>" +
			'<td><span class="badge text-bg-' + badgeClass + '">' + statusLabel + "</span></td>";

		applicationsTableBody.appendChild(row);
	});
}

async function loadApplications() {
	try {
		const [applications, jobs, companies] = await Promise.all([
			apiFetchJson("/applications"),
			apiFetchJson("/jobs"),
			apiFetchJson("/api/companies").catch(function () {
				return [];
			}),
		]);

		const jobMap = new Map((jobs || []).map(function (job) {
			return [job.id, job];
		}));

		const companyMap = new Map((companies || []).map(function (company) {
			return [company.id, company.name || company.razon_social || "Empresa"];
		}));

		const ownApplications = (applications || [])
			.filter(function (application) {
				return (application.candidate_id || application.user_id) === currentUser.id;
			})
			.map(function (application) {
				const jobPostId = application.job_post_id || application.job_id;
				const relatedJob = jobMap.get(jobPostId) || null;
				const companyName = relatedJob?.company_id
					? companyMap.get(relatedJob.company_id) || "No disponible"
					: "No disponible";

				return {
					...application,
					job_posts: relatedJob,
					company_name: application.company_name || companyName,
				};
			})
			.sort(function (a, b) {
				return new Date(b.applied_at || b.created_at || 0) - new Date(a.applied_at || a.created_at || 0);
			});

		renderApplications(ownApplications);
	} catch (error) {
		console.error("Error cargando postulaciones:", error);
		renderApplications([]);
	}
}

function sanitizeFileName(fileName) {
	return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isPdfUrl(url) {
	return String(url || "").toLowerCase().includes(".pdf");
}

function setCvPreview(url, isPdf) {
	if (!openCvLink || !emptyCvState || !cvPreviewFrame) {
		return;
	}

	if (isPdf) {
		cvPreviewFrame.src = url;
		cvPreviewFrame.classList.remove("d-none");
		emptyCvState.classList.add("d-none");
	} else {
		cvPreviewFrame.classList.add("d-none");
		emptyCvState.className = "alert alert-info mb-0";
		emptyCvState.textContent =
			"Archivo cargado. La vista embebida esta disponible para PDF; para DOC/DOCX usa 'Abrir en nueva pestana'.";
		emptyCvState.classList.remove("d-none");
	}

	openCvLink.href = url;
	openCvLink.classList.remove("disabled");
	openCvLink.setAttribute("aria-disabled", "false");
}

function onCvFileChange(event) {
	const file = event.target.files[0];
	if (!file) {
		return;
	}

	const allowedExtensions = ["pdf", "doc", "docx"];
	const extension = file.name.split(".").pop().toLowerCase();
	const isPdf = extension === "pdf";

	if (!allowedExtensions.includes(extension)) {
		cvUploadMessage.className = "small text-danger";
		cvUploadMessage.textContent = "Solo se permiten archivos PDF, DOC o DOCX.";
		cvFileInput.value = "";
		selectedCvFile = null;
		return;
	}

	if (currentCvObjectUrl) {
		URL.revokeObjectURL(currentCvObjectUrl);
	}

	currentCvObjectUrl = URL.createObjectURL(file);
	selectedCvFile = file;
	setCvPreview(currentCvObjectUrl, isPdf);

	cvUploadMessage.className = "small text-success";
	cvUploadMessage.textContent = "Vista previa lista: " + file.name;
}

async function uploadCvToStorage(file) {
	const fileAsBase64 = await new Promise(function (resolve, reject) {
		const reader = new FileReader();
		reader.onload = function () {
			const dataUrl = String(reader.result || "");
			resolve(dataUrl.split(",")[1] || "");
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});

	const response = await apiFetchJson("/api/profiles/" + currentUser.id + "/cv-upload", {
		method: "POST",
		body: JSON.stringify({
			fileName: sanitizeFileName(file.name),
			fileType: file.type,
			fileDataBase64: fileAsBase64,
		}),
	});

	currentProfile = response?.profile || currentProfile;
	return response?.cvUrl || null;
}

async function uploadAvatarToStorage(file) {
	const fileAsBase64 = await new Promise(function (resolve, reject) {
		const reader = new FileReader();
		reader.onload = function () {
			const dataUrl = String(reader.result || "");
			resolve(dataUrl.split(",")[1] || "");
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});

	const response = await apiFetchJson("/api/profiles/" + currentUser.id + "/avatar-upload", {
		method: "POST",
		body: JSON.stringify({
			fileName: sanitizeFileName(file.name),
			fileType: file.type,
			fileDataBase64: fileAsBase64,
		}),
	});

	currentProfile = response?.profile || currentProfile;
	return response?.avatarUrl || null;
}

async function onUploadCvClick() {
	if (!selectedCvFile) {
		cvUploadMessage.className = "small text-danger";
		cvUploadMessage.textContent = "Selecciona un archivo antes de cargar.";
		return;
	}

	try {
		cvUploadMessage.className = "small text-muted";
		cvUploadMessage.textContent = "Subiendo CV...";

		const cvUrl = await uploadCvToStorage(selectedCvFile);
		if (!cvUrl) {
			throw new Error("No se obtuvo URL publica para el CV");
		}

		setCvPreview(cvUrl, isPdfUrl(cvUrl));

		cvUploadMessage.className = "small text-success";
		cvUploadMessage.textContent = "CV cargado y guardado en Supabase.";
	} catch (error) {
		console.error(error);
		cvUploadMessage.className = "small text-danger";
		cvUploadMessage.textContent = "No se pudo subir el CV. Revisa el bucket de storage y permisos.";
	}
}

function renderKeywords() {
	if (!keywordsContainer) {
		return;
	}

	keywordsContainer.innerHTML = "";

	if (alertKeywords.length === 0) {
		const hint = document.createElement("span");
		hint.className = "text-muted small";
		hint.textContent = "No has agregado palabras clave.";
		keywordsContainer.appendChild(hint);
		return;
	}

	alertKeywords.forEach(function (keyword) {
		const badge = document.createElement("span");
		badge.className = "badge text-bg-primary d-inline-flex align-items-center gap-2";
		badge.innerHTML =
			'<span>' + keyword + '</span><button type="button" class="btn-close btn-close-white" aria-label="Eliminar"></button>';

		badge.querySelector("button").addEventListener("click", function () {
			removeKeyword(keyword);
		});

		keywordsContainer.appendChild(badge);
	});
}

function renderSuggestedJobs() {
	if (!jobsAlertsList || !alertsEmptyState || !matchCountBadge) {
		return;
	}

	jobsAlertsList.innerHTML = "";

	if (!alertKeywords.length) {
		jobsAlertsList.classList.add("d-none");
		alertsEmptyState.className = "alert alert-secondary mb-0";
		alertsEmptyState.textContent = "Agrega al menos una palabra clave para ver sugerencias.";
		alertsEmptyState.classList.remove("d-none");
		matchCountBadge.textContent = "0 resultados";
		return;
	}

	const normalizedKeywords = alertKeywords.map(function (word) {
		return word.toLowerCase();
	});

	const matchedJobs = availableJobs.filter(function (job) {
		const haystack = [
			job.title,
			job.description,
			job.location,
			job.contract_type,
			job.experience_level,
			job.company_name,
		]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();

		return normalizedKeywords.some(function (keyword) {
			return haystack.includes(keyword);
		});
	});

	matchCountBadge.textContent = matchedJobs.length + " resultados";

	if (!matchedJobs.length) {
		jobsAlertsList.classList.add("d-none");
		alertsEmptyState.className = "alert alert-warning mb-0";
		alertsEmptyState.textContent = "No encontramos empleos con esas palabras clave.";
		alertsEmptyState.classList.remove("d-none");
		return;
	}

	alertsEmptyState.classList.add("d-none");
	jobsAlertsList.classList.remove("d-none");

	matchedJobs.forEach(function (job) {
		const item = document.createElement("div");
		item.className = "list-group-item list-group-item-action";

		const title = job.title || "Oferta laboral";
		const company = job.company_name || "Empresa";
		const location = job.location || "Ubicacion no especificada";
		const modality = job.contract_type || "Modalidad sin definir";

		item.innerHTML =
			'<div class="d-flex w-100 justify-content-between align-items-start mb-1">' +
			'<h6 class="mb-0">' +
			title +
			"</h6>" +
			'<span class="badge text-bg-light border">' +
			modality +
			"</span>" +
			"</div>" +
			'<p class="mb-1 text-muted">' +
			company +
			" - " +
			location +
			"</p>";

		jobsAlertsList.appendChild(item);
	});
}

async function loadAlertsAndJobs() {
	try {
		const [alertsResponse, jobsResponse] = await Promise.all([
			apiFetchJson("/alerts"),
			apiFetchJson("/jobs"),
		]);

		alertRows = (alertsResponse || []).filter(function (row) {
			return row.user_id === currentUser.id;
		});
		availableJobs = jobsResponse || [];

		alertKeywords = Array.from(
			new Set(
				alertRows
					.map(function (row) {
						return String(row.keyword || "").trim().toLowerCase();
					})
					.filter(Boolean)
			)
		);
	} catch (error) {
		console.error("Error cargando alertas y empleos:", error);
		alertRows = [];
		availableJobs = [];
		alertKeywords = [];
	}
}

async function onAddKeywordClick() {
	const keyword = keywordInput?.value?.trim().toLowerCase();
	if (!keyword) {
		return;
	}

	if (alertKeywords.includes(keyword)) {
		keywordInput.value = "";
		return;
	}

	alertKeywords.push(keyword);
	renderKeywords();
	renderSuggestedJobs();
	keywordInput.value = "";

	const payload = {
		keyword,
		location: ubicacionInput?.value || null,
		user_id: currentUser.id,
	};

	try {
		const data = await apiFetchJson("/alerts", {
			method: "POST",
			body: JSON.stringify(payload),
		});

		alertRows.push(data);
	} catch (error) {
		console.error("No se pudo guardar la alerta:", error);
	}
}

async function removeKeyword(keyword) {
	alertKeywords = alertKeywords.filter(function (item) {
		return item !== keyword;
	});

	renderKeywords();
	renderSuggestedJobs();

	const found = alertRows.find(function (row) {
		return String(row.keyword || "").toLowerCase() === keyword;
	});

	if (!found?.id) {
		return;
	}

	try {
		await apiFetchJson("/alerts/" + found.id, {
			method: "DELETE",
		});
	} catch (error) {
		console.error("No se pudo eliminar la alerta:", error);
		return;
	}

	alertRows = alertRows.filter(function (row) {
		return row.id !== found.id;
	});
}
