let consejos = [];
let foros = [];

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
  const { data, error } = await supabaseClient.from("tips").select("*");
  const container = document.getElementById("consejos-list");
  if (error) {
    console.error("Error cargando consejos:", error.message);
    container.innerHTML = "<p class='text-danger'>No fue posible cargar los consejos.</p>";
    return;
  }
  consejos = data || [];
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
  const { data, error } = await supabaseClient.from("forum_threads").select("*");
  const container = document.getElementById("foros-list");
  if (error) {
    console.error("Error cargando foros:", error.message);
    container.innerHTML = "<p class='text-danger'>No fue posible cargar los temas del foro.</p>";
    return;
  }
  foros = data || [];
  container.innerHTML = foros.length
    ? foros
        .map((thread) => {
          const author = thread.author || thread.created_by || "Usuario";
          const date = formatDate(thread.created_at || thread.date);
          const replies = thread.reply_count || thread.replies || 0;
          return `
            <div class="forum-card">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <div class="fw-semibold" style="font-size:14px">${thread.title || "Tema sin título"}</div>
                  <div class="text-muted" style="font-size:12px">Por ${author}</div>
                  <div class="text-muted" style="font-size:12px">💬 ${replies} respuestas &nbsp; ${date}</div>
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
    status: "open",
    user_id: userId,
  };
  const { data, error } = await supabaseClient.from("forum_threads").insert([payload]).select().single();
  if (error) {
    throw error;
  }
  return data;
}

async function createTip(title, description, category) {
  const payload = {
    title,
    description,
    category,
  };
  const { data, error } = await supabaseClient.from("tips").insert([payload]).select().single();
  if (error) {
    throw error;
  }
  return data;
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
  loadConsejos();
  loadForos();
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
