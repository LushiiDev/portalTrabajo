import {
  ensureAdminBanner,
  formatDate,
  daysAgo,
  openJsonModal,
  requireSession,
  apiFetch,
  setActiveSidebar,
  showToast,
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

function normalizeStatus(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("pend")) return "pendiente";
  if (v.includes("revis")) return "revision";
  if (
    v.includes("resuel") ||
    v.includes("close") ||
    v.includes("done") ||
    v.includes("aprob") ||
    v.includes("rech")
  )
    return "resuelto";
  return v || "pendiente";
}

function prettyStatus(status) {
  const v = normalizeStatus(status);
  return v === "revision"
    ? "En revisión"
    : v === "resuelto"
      ? "Resuelto"
      : "Pendiente";
}

function statusBadgeClass(status) {
  const v = normalizeStatus(status);
  return v === "resuelto"
    ? "badge-status"
    : v === "revision"
      ? "badge-status yellow"
      : "badge-status red";
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
  try {
    const result = await apiFetch("/api/admin/moderation");
    threads = result?.threads || [];
    reviews = result?.reviews || [];
  } catch (e) {
    showToast(
      "No se pudieron cargar datos de moderación: " + e.message,
      "danger",
    );
    threads = [];
    reviews = [];
  }
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
  const pending = items.filter(
    (i) => normalizeStatus(i.status) === "pendiente",
  ).length;
  const review = items.filter(
    (i) => normalizeStatus(i.status) === "revision",
  ).length;
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
          <td><span class="badge-soft badge-role gray">${escapeHtml(i.type)}</span></td>
          <td class="fw-semibold">${escapeHtml(content)}</td>
          <td class="text-muted">${escapeHtml(i.author)}</td>
          <td class="text-muted">${escapeHtml(date)}</td>
          <td><span class="badge-soft ${stCls}">${escapeHtml(st)}</span></td>
          <td class="text-end">
            <button class="btn-action btn-view me-1" data-action="view" data-table="${i.table}" data-id="${i.id}" title="Ver">
              <i class="bi bi-eye"></i>
            </button>
            ${
              canResolve
                ? `
                  <button class="btn-action btn-warn me-1" data-action="review" data-table="${i.table}" data-id="${i.id}" title="Marcar en revisión">
                    <i class="bi bi-hourglass-split"></i>
                  </button>
                  <button class="btn-action btn-ok me-1" data-action="resolve" data-table="${i.table}" data-id="${i.id}" title="Resolver">
                    <i class="bi bi-check2"></i>
                  </button>
                `
                : ""
            }
            <button class="btn-action btn-danger" data-action="delete" data-table="${i.table}" data-id="${i.id}" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function findItem(table, id) {
  if (table === "forum_threads")
    return threads.find((t) => String(t.id) === String(id));
  if (table === "reviews")
    return reviews.find((r) => String(r.id) === String(id));
  return null;
}

async function updateStatus(table, id, status) {
  try {
    const updated = await apiFetch(
      `/api/admin/moderation/${table}/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );
    return updated;
  } catch (e) {
    showToast(
      `No se pudo actualizar status en ${table}. ` +
        `Asegúrate de que exista columna 'status' y permisos/RLS. Detalle: ${e.message}`,
      "warning",
    );
    return null;
  }
}

async function deleteRow(table, id) {
  const ok = confirm(`¿Eliminar este registro de ${table}?`);
  if (!ok) return false;
  try {
    await apiFetch(`/api/admin/moderation/${table}/${id}`, {
      method: "DELETE",
    });
  } catch (e) {
    showToast("No se pudo eliminar: " + e.message, "danger");
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
        if (table === "forum_threads")
          threads = threads.map((t) =>
            String(t.id) === String(id) ? updated : t,
          );
        if (table === "reviews")
          reviews = reviews.map((r) =>
            String(r.id) === String(id) ? updated : r,
          );
        rerender();
      }
      return;
    }

    if (action === "resolve") {
      const updated = await updateStatus(table, id, "resuelto");
      if (updated) {
        showToast("Marcado como resuelto.", "success");
        if (table === "forum_threads")
          threads = threads.map((t) =>
            String(t.id) === String(id) ? updated : t,
          );
        if (table === "reviews")
          reviews = reviews.map((r) =>
            String(r.id) === String(id) ? updated : r,
          );
        rerender();
      }
      return;
    }

    if (action === "delete") {
      const ok = await deleteRow(table, id);
      if (ok) {
        showToast("Eliminado.", "success");
        if (table === "forum_threads")
          threads = threads.filter((t) => String(t.id) !== String(id));
        if (table === "reviews")
          reviews = reviews.filter((r) => String(r.id) !== String(id));
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
