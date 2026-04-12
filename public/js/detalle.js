function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    type: params.get("type"),
    id: params.get("id"),
  };
}

let perfilesById = new Map();

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

function renderTipDetail(tip) {
  const description = tip.description || "Sin descripción disponible.";
  document.getElementById("detail-content").innerHTML = `
    <div class="detail-hero">
      <div style="font-size:36px;margin-bottom:10px">📝</div>
      <h2 style="font-weight:700;margin-bottom:10px">${tip.title || "Consejo sin título"}</h2>
      <div style="margin-bottom:12px"><span class="badge-tag">${tip.category || "Consejo"}</span></div>
      <div class="text-muted" style="font-size:14px;line-height:1.8">${description.replace(/\n/g, "<br>")}</div>
    </div>
  `;
  document.getElementById("replies-section").innerHTML = `
    <div class="mt-4">
      <h5>Respuestas</h5>
      <p class="text-muted">Este consejo no tiene respuestas. Puedes volver al foro o crear un nuevo tema si deseas compartir tu comentario.</p>
    </div>
  `;
}

function renderThreadDetail(thread, replies) {
  const content = thread.content || thread.description || "Sin descripción adicional.";
  const author = getProfileName(thread.user_id) || thread.author || thread.created_by || "Usuario";
  document.getElementById("detail-content").innerHTML = `
    <div class="detail-hero">
      <div style="font-size:24px;margin-bottom:10px">💬</div>
      <h2 style="font-weight:700;margin-bottom:10px">${thread.title || "Hilo del foro"}</h2>
      <div style="margin-bottom:12px"><span class="badge-tag">${thread.category || "Foro"}</span></div>
      <div class="reply-meta" style="margin-bottom:10px">Por ${author} · ${formatDate(thread.created_at)}</div>
      <div class="text-muted" style="font-size:14px;line-height:1.8">${content.replace(/\n/g, "<br>")}</div>
    </div>
  `;

  document.getElementById("replies-section").innerHTML = `
    <div class="mt-4">
      <h5>${replies.length} respuesta${replies.length === 1 ? "" : "s"}</h5>
      ${replies.length
        ? replies
            .map((reply) => `
              <div class="reply-card">
                <div class="reply-meta mb-2">
                  Por ${getProfileName(reply.user_id) || "Usuario"} · ${formatDate(reply.created_at)}
                </div>
                <div style="font-size:14px;line-height:1.8">${(reply.content || "").replace(/\n/g, "<br>")}</div>
              </div>
            `)
            .join("")
        : `<p class="text-muted">Todavía no hay respuestas para este hilo.</p>`}
    </div>
    <div class="mt-4">
      <h5 class="mb-3">Agregar una respuesta</h5>
      <form id="reply-form">
        <div class="mb-3">
          <textarea class="form-control" id="replyContent" rows="4" required minlength="10" placeholder="Escribe tu respuesta aquí..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Publicar respuesta</button>
      </form>
    </div>
  `;

  attachReplyHandler(thread.id);
}

async function getCurrentUserId() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data?.session) return null;
  return data.session.user?.id || null;
}

async function createReply(threadId, content) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Debes iniciar sesión para publicar una respuesta.");
  }
  const payload = {
    thread_id: threadId,
    user_id: userId,
    content,
    status: "active",
  };

  const response = await fetch(`${API_BASE_URL}/forum_replies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("No se pudo publicar la respuesta");
  }

  return await response.json();
}

function attachReplyHandler(threadId) {
  const replyForm = document.getElementById("reply-form");
  if (!replyForm) return;
  replyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const contentInput = document.getElementById("replyContent");
    const content = contentInput.value.trim();
    if (!content) {
      alert("Escribe tu respuesta antes de publicar.");
      return;
    }
    try {
      await createReply(threadId, content);
      contentInput.value = "";
      await loadThread(threadId);
    } catch (error) {
      console.error("No se pudo publicar la respuesta:", error.message);
      alert(error.message || "Error al publicar la respuesta.");
    }
  });
}

async function loadTip(id) {
  const response = await fetch(`${API_BASE_URL}/tips`);
  if (!response.ok) {
    document.getElementById("detail-content").innerHTML = `<p class="text-danger">No se encontró el consejo solicitado.</p>`;
    return;
  }

  const tips = await response.json();
  const tip = (tips || []).find((item) => item.id === id);

  if (!tip) {
    document.getElementById("detail-content").innerHTML = `<p class="text-danger">No se encontró el consejo solicitado.</p>`;
    return;
  }

  renderTipDetail(tip);
}

async function loadThread(id) {
  const [threadsResponse, repliesResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/forum_threads`),
    fetch(`${API_BASE_URL}/forum_replies`),
  ]);

  if (!threadsResponse.ok || !repliesResponse.ok) {
    document.getElementById("detail-content").innerHTML = `<p class="text-danger">No se encontró el hilo solicitado.</p>`;
    return;
  }

  const threads = await threadsResponse.json();
  const allReplies = await repliesResponse.json();
  const thread = (threads || []).find((item) => item.id === id);

  if (!thread) {
    document.getElementById("detail-content").innerHTML = `<p class="text-danger">No se encontró el hilo solicitado.</p>`;
    return;
  }

  const replies = (allReplies || [])
    .filter((reply) => reply.thread_id === id)
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  renderThreadDetail(thread, replies);
}

async function initDetailPage() {
  await loadProfiles();
  const params = getQueryParams();
  if (!params.type || !params.id) {
    document.getElementById("detail-content").innerHTML = `<p class="text-danger">Faltan parámetros en la URL.</p>`;
    return;
  }

  if (params.type === "thread") {
    await loadThread(params.id);
  } else if (params.type === "tip") {
    await loadTip(params.id);
  } else {
    document.getElementById("detail-content").innerHTML = `<p class="text-danger">Tipo de detalle no reconocido.</p>`;
  }
}

window.addEventListener("DOMContentLoaded", initDetailPage);
