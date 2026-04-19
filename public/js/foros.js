let consejos = [];
let foros = [];
let replies = [];
let perfilesById = new Map();

function normalizeContentStatus(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("inact") || v.includes("elim") || v.includes("close") || v.includes("off")) return "inactivo";
  if (v.includes("act") || v.includes("open") || v.includes("publ") || v.includes("ok")) return "activo";
  return v || "activo";
}

function getProfileName(userId) {
  if (!userId) return "";
  const profile = perfilesById.get(userId);
  return (profile?.full_name || "").trim();
}

async function loadProfiles() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/profiles`);
    if (!response.ok) throw new Error("No fue posible cargar perfiles");
    const profiles = await response.json();
    perfilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  } catch (error) {
    console.error("Error cargando perfiles:", error.message);
    perfilesById = new Map();
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function shortText(text, limit = 110) {
  if (!text) return "";
  return text.length <= limit ? text : text.slice(0, limit).trim() + "...";
}

async function loadConsejos() {
  const container = document.getElementById("consejos-list");
  try {
    const response = await fetch(`${API_BASE_URL}/tips`);
    if (!response.ok) throw new Error("No fue posible cargar los consejos");
    const allTips = await response.json();
    consejos = (allTips || []).filter((tip) => normalizeContentStatus(tip.status) === "activo");
  } catch (error) {
    console.error("Error cargando consejos:", error.message);
    container.innerHTML = "<p class='text-danger'>No fue posible cargar los consejos.</p>";
    return;
  }

  container.innerHTML = consejos.length
    ? consejos
        .map((tip) => {
          const description = tip.description || tip.content || tip.category || "Sin descripción disponible.";
          return `
            <div class="card-resource p-3">
              <div class="d-flex gap-3 align-items-start mb-2">
                <div class="icon-box">${tip.icon || "📝"}</div>
                <div>
                  <div class="fw-semibold" style="font-size:15px">${tip.title || "Consejo sin título"}</div>
                  <div class="text-muted" style="font-size:13px">${shortText(description, 120)}</div>
                </div>
              </div>
              <button class="btn-leer" onclick="openDetallePage('tip', '${tip.id}')">Leer más</button>
            </div>
          `;
        })
        .join("")
    : "<p class='text-muted'>No hay consejos disponibles en este momento.</p>";
}

async function loadForos() {
  const container = document.getElementById("foros-list");

  try {
    const [threadsResponse, repliesResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/forum_threads`),
      fetch(`${API_BASE_URL}/forum_replies`),
    ]);

    if (!threadsResponse.ok || !repliesResponse.ok) {
      throw new Error("No fue posible cargar los temas del foro");
    }

    foros = (await threadsResponse.json()) || [];
    replies = (await repliesResponse.json()) || [];
    foros = foros.filter((thread) => normalizeContentStatus(thread.status) === "activo");
    replies = replies.filter((reply) => normalizeContentStatus(reply.status) === "activo");
  } catch (error) {
    console.error("Error cargando foros:", error.message);
    container.innerHTML = "<p class='text-danger'>No fue posible cargar los temas del foro.</p>";
    return;
  }

  const repliesByThread = replies.reduce((acc, reply) => {
    const threadId = reply.thread_id;
    if (!threadId) return acc;
    acc[threadId] = (acc[threadId] || 0) + 1;
    return acc;
  }, {});

  const sortedThreads = [...foros].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  container.innerHTML = foros.length
    ? sortedThreads
        .map((thread) => {
          const author = getProfileName(thread.user_id) || "Usuario";
          const date = formatDate(thread.created_at || thread.date);
          const repliesCount = repliesByThread[thread.id] || 0;
          return `
            <div class="forum-card">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <div class="fw-semibold" style="font-size:14px">${thread.title || "Tema sin título"}</div>
                  <div class="text-muted" style="font-size:12px">Por ${author}</div>
                  <div class="text-muted" style="font-size:12px">💬 ${repliesCount} respuestas &nbsp; ${date}</div>
                </div>
                <button class="btn-ver" onclick="openDetallePage('thread', '${thread.id}')">Ver hilo</button>
              </div>
            </div>
          `;
        })
        .join("")
    : "<p class='text-muted'>No hay temas en el foro por el momento.</p>";
}

function openDetallePage(type, id) {
  window.location.href = `./detalle.html?type=${type}&id=${id}`;
}

async function showConsejo(id) {
  openDetallePage('tip', id);
}

async function showForo(id) {
  openDetallePage('thread', id);
}

async function getCurrentUserId() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data?.session) return null;
  return data.session.user?.id || null;
}

async function createThread(title, content, category) {
  const userId = await getCurrentUserId();
  const payload = {
    title,
    content,
    category,
    status: "activo",
    user_id: userId,
  };

  const response = await fetch(`${API_BASE_URL}/forum_threads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("No se pudo crear el tema del foro");
  }

  return await response.json();
}

async function createTip(title, description, category) {
  const userId = await getCurrentUserId();
  const payload = {
    title,
    description,
    category,
    user_id: userId,
  };

  const response = await fetch(`${API_BASE_URL}/tips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("No se pudo crear el consejo");
  }

  return await response.json();
}

async function handleNewTopicSubmit(event) {
  event.preventDefault();
  const topicType = document.querySelector("input[name='topicType']:checked")?.value || "thread";
  const title = document.getElementById("topicTitle").value.trim();
  const category = document.getElementById("topicCategory").value.trim();
  const content = document.getElementById("topicContent").value.trim();

  if (!title || !category || !content) {
    alert("Completa todos los campos para crear el tema.");
    return;
  }

  try {
    const modalEl = document.getElementById("newTopicModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    if (topicType === "tip") {
      const tip = await createTip(title, content, category);
      document.getElementById("newTopicForm").reset();
      await loadConsejos();
      window.location.href = `./detalle.html?type=tip&id=${tip.id}`;
      return;
    }

    const thread = await createThread(title, content, category);
    document.getElementById("newTopicForm").reset();
    await loadForos();
    window.location.href = `./detalle.html?type=thread&id=${thread.id}`;
  } catch (error) {
    console.error("Error creando el tema:", error.message);
    alert("No se pudo crear el tema. Revisa la consola para más detalles.");
  }
}

function showMain() {
  document.getElementById("main-view").style.display = "block";
  document.getElementById("detail-view").style.display = "none";
  window.scrollTo(0, 0);
}

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    await loadProfiles();
    await loadConsejos();
    await loadForos();
  })();
  const newTopicButton = document.getElementById("btnNuevoTema");
  if (newTopicButton) {
    newTopicButton.addEventListener("click", () => {
      const modalEl = document.getElementById("newTopicModal");
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    });
  }
  const newTopicForm = document.getElementById("newTopicForm");
  if (newTopicForm) {
    newTopicForm.addEventListener("submit", handleNewTopicSubmit);
  }
});
