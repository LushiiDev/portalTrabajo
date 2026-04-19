import {
  ensureAdminBanner,
  formatDate,
  daysAgo,
  openJsonModal,
  requireSession,
  isDemoMode,
  setActiveSidebar,
  showToast,
  supabaseClient,
} from "./adminBase.js";

setActiveSidebar("adminforos.html");

const els = {
  allTbody: document.getElementById("allTbody"),
  threadsTbody: document.getElementById("threadsTbody"),
  reviewsTbody: document.getElementById("reviewsTbody"),
  statPending: document.getElementById("statPending"),
  statReview: document.getElementById("statReview"),
  statResolved7: document.getElementById("statResolved7"),
  statTotal: document.getElementById("statTotal"),
};

let threads = [];
let reviews = [];
const demoMode = isDemoMode();

function normalizeStatus(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("pend")) return "pendiente";
  if (v.includes("revis")) return "revision";
  if (v.includes("resuel") || v.includes("close") || v.includes("done") || v.includes("aprob") || v.includes("rech"))
    return "resuelto";
  return v || "pendiente";
}

function prettyStatus(status) {
  const v = normalizeStatus(status);
  return v === "revision" ? "En revisión" : v === "resuelto" ? "Resuelto" : "Pendiente";
}

function statusBadgeClass(status) {
  const v = normalizeStatus(status);
  return v === "resuelto"
    ? "text-bg-success"
    : v === "revision"
      ? "text-bg-warning text-dark"
      : "text-bg-danger";
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortText(text, limit = 80) {
  const t = String(text || "").trim();
  if (!t) return "-";
  return t.length <= limit ? t : t.slice(0, limit).trim() + "...";
}

async function loadData() {
  if (demoMode) {
    threads = [
      {
        id: "t1",
        title: "¿Cómo negociar el salario?",
        content: "Comentario con lenguaje inapropiado y falta de respeto...",
        user_id: "Usuario123",
        status: "pendiente",
        created_at: "2026-03-14T10:00:00Z",
      },
      {
        id: "t2",
        title: "Mejores empresas tech en Madrid",
        content: "Spam con enlaces externos a sitios no relacionados...",
        user_id: "TechGuru99",
        status: "pendiente",
        created_at: "2026-03-13T10:00:00Z",
      },
      {
        id: "t3",
        title: "Transición de frontend a full-stack",
        content: "Publicación repetitiva que ya fue respondida...",
        user_id: "DevNovato",
        status: "resuelto",
        created_at: "2026-03-11T10:00:00Z",
      },
    ];

    reviews = [
      {
        id: "r1",
        company_id: "TechCorp",
        comment: "Review con insultos hacia la dirección...",
        user_id: "EmpleadoX",
        status: "pendiente",
        created_at: "2026-03-12T10:00:00Z",
      },
    ];
    return;
  }

  const threadsReq = supabaseClient.from("forum_threads").select("*").order("created_at", { ascending: false });
  const reviewsReq = supabaseClient.from("reviews").select("*").order("created_at", { ascending: false });

  const [{ data: tData, error: tErr }, { data: rData, error: rErr }] = await Promise.all([threadsReq, reviewsReq]);

  if (tErr) showToast("No se pudieron cargar forum_threads: " + tErr.message, "danger");
  if (rErr) showToast("No se pudieron cargar reviews: " + rErr.message, "danger");

  threads = tData || [];
  reviews = rData || [];
}

function toItems() {
  const threadItems = threads.map((t) => ({
    type: "Foro",
    table: "forum_threads",
    id: t.id,
    raw: t,
    content: t.title ? `${t.title} — ${t.content || ""}` : t.content || "",
    author: t.author || t.created_by || t.user_id || "-",
    date: t.created_at || t.date || null,
    status: t.status || "pendiente",
  }));

  const reviewItems = reviews.map((r) => ({
    type: "Valoración",
    table: "reviews",
    id: r.id,
    raw: r,
    content: r.comment || r.content || "",
    author: r.user_id || r.author || "-",
    date: r.created_at || null,
    status: r.status || "pendiente",
  }));

  return { all: [...threadItems, ...reviewItems], threadItems, reviewItems };
}

function computeStats(items) {
  const total = items.length;
  const pending = items.filter((i) => normalizeStatus(i.status) === "pendiente").length;
  const review = items.filter((i) => normalizeStatus(i.status) === "revision").length;
  const resolved7 = items.filter((i) => {
    if (normalizeStatus(i.status) !== "resuelto") return false;
    const d = daysAgo(i.date);
    return d !== null && d <= 7;
  }).length;

  els.statTotal.textContent = total;
  els.statPending.textContent = pending;
  els.statReview.textContent = review;
  els.statResolved7.textContent = resolved7;
}

function renderTable(tbody, items) {
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted">No hay elementos.</td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map((i) => {
      const st = prettyStatus(i.status);
      const stCls = statusBadgeClass(i.status);
      const date = formatDate(i.date);
      const content = shortText(i.content, 95);
      const canResolve = normalizeStatus(i.status) !== "resuelto";

      return `
        <tr>
          <td><span class="badge rounded-pill text-bg-secondary">${escapeHtml(i.type)}</span></td>
          <td class="fw-semibold">${escapeHtml(content)}</td>
          <td class="text-muted">${escapeHtml(i.author)}</td>
          <td class="text-muted">${escapeHtml(date)}</td>
          <td><span class="badge rounded-pill ${stCls}">${escapeHtml(st)}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" data-action="view" data-table="${i.table}" data-id="${i.id}" title="Ver">
              <i class="bi bi-eye"></i>
            </button>
            ${
              canResolve
                ? `
                  <button class="btn btn-sm btn-outline-warning me-1" data-action="review" data-table="${i.table}" data-id="${i.id}" title="Marcar en revisión">
                    <i class="bi bi-hourglass-split"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-success me-1" data-action="resolve" data-table="${i.table}" data-id="${i.id}" title="Resolver">
                    <i class="bi bi-check2"></i>
                  </button>
                `
                : ""
            }
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-table="${i.table}" data-id="${i.id}" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function findItem(table, id) {
  if (table === "forum_threads") return threads.find((t) => String(t.id) === String(id));
  if (table === "reviews") return reviews.find((r) => String(r.id) === String(id));
  return null;
}

async function updateStatus(table, id, status) {
  if (demoMode) {
    showToast("Modo demo: status actualizado localmente.", "info");
    if (table === "forum_threads") {
      threads = threads.map((t) => (String(t.id) === String(id) ? { ...t, status } : t));
      return threads.find((t) => String(t.id) === String(id)) || null;
    }
    if (table === "reviews") {
      reviews = reviews.map((r) => (String(r.id) === String(id) ? { ...r, status } : r));
      return reviews.find((r) => String(r.id) === String(id)) || null;
    }
    return null;
  }

  const { data, error } = await supabaseClient.from(table).update({ status }).eq("id", id).select().single();
  if (error) {
    showToast(
      `No se pudo actualizar status en ${table}. ` +
        `Asegúrate de que exista la columna 'status' y permisos/RLS. Detalle: ${error.message}`,
      "warning",
    );
    return null;
  }
  return data;
}

async function deleteRow(table, id) {
  if (demoMode) {
    if (table === "forum_threads") threads = threads.filter((t) => String(t.id) !== String(id));
    if (table === "reviews") reviews = reviews.filter((r) => String(r.id) !== String(id));
    showToast("Modo demo: eliminado localmente.", "info");
    return true;
  }

  const ok = confirm(`¿Eliminar este registro de ${table}?`);
  if (!ok) return false;

  const { error } = await supabaseClient.from(table).delete().eq("id", id);
  if (error) {
    showToast("No se pudo eliminar: " + error.message, "danger");
    return false;
  }
  return true;
}

function rerender() {
  const { all, threadItems, reviewItems } = toItems();
  computeStats(all);
  renderTable(els.allTbody, all);
  renderTable(els.threadsTbody, threadItems);
  renderTable(els.reviewsTbody, reviewItems);
}

function wireActions() {
  const handler = async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const table = btn.getAttribute("data-table");
    const id = btn.getAttribute("data-id");

    if (!table || !id) return;

    if (action === "view") {
      const row = findItem(table, id);
      if (row) openJsonModal(`Detalle (${table})`, row);
      return;
    }

    if (action === "review") {
      const updated = await updateStatus(table, id, "revision");
      if (updated) {
        showToast("Marcado en revisión.", "success");
        if (table === "forum_threads") threads = threads.map((t) => (String(t.id) === String(id) ? updated : t));
        if (table === "reviews") reviews = reviews.map((r) => (String(r.id) === String(id) ? updated : r));
        rerender();
      }
      return;
    }

    if (action === "resolve") {
      const updated = await updateStatus(table, id, "resuelto");
      if (updated) {
        showToast("Marcado como resuelto.", "success");
        if (table === "forum_threads") threads = threads.map((t) => (String(t.id) === String(id) ? updated : t));
        if (table === "reviews") reviews = reviews.map((r) => (String(r.id) === String(id) ? updated : r));
        rerender();
      }
      return;
    }

    if (action === "delete") {
      const ok = await deleteRow(table, id);
      if (ok) {
        showToast("Eliminado.", "success");
        if (table === "forum_threads") threads = threads.filter((t) => String(t.id) !== String(id));
        if (table === "reviews") reviews = reviews.filter((r) => String(r.id) !== String(id));
        rerender();
      }
    }
  };

  [els.allTbody, els.threadsTbody, els.reviewsTbody].forEach((tb) => {
    if (!tb) return;
    tb.addEventListener("click", handler);
  });
}

async function init() {
  wireActions();
  const session = await requireSession();
  if (!session) return;
  ensureAdminBanner(session);

  await loadData();
  rerender();
}

document.addEventListener("DOMContentLoaded", init);
