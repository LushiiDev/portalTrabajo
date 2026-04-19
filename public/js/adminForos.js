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
  repliesTbody: document.getElementById("repliesTbody"),
  reviewsTbody: document.getElementById("reviewsTbody"),
  tipsTbody: document.getElementById("tipsTbody"),
  statActive: document.getElementById("statActive"),
  statInactive: document.getElementById("statInactive"),
  statTips: document.getElementById("statTips"),
  statTotal: document.getElementById("statTotal"),
};

let threads = [];
let replies = [];
let reviews = [];
let tips = [];
let profilesById = new Map();

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim(),
  );
}

function getProfileDisplayName(profile) {
  if (!profile || typeof profile !== "object") return "";
  return String(
    profile.full_name || profile.name || profile.nombre || profile.headline || "",
  ).trim();
}

function resolveAuthorName(userId, fallbackAuthor) {
  const id = String(userId || "").trim();
  if (id) {
    const profileName = getProfileDisplayName(profilesById.get(id));
    if (profileName) return profileName;
  }

  const fallback = String(fallbackAuthor || "").trim();
  if (!fallback || isUuidLike(fallback)) return "-";
  return fallback;
}

function normalizeStatus(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("inact") || v.includes("elim") || v.includes("close") || v.includes("off")) return "inactivo";
  if (v.includes("act") || v.includes("open") || v.includes("publ") || v.includes("ok")) return "activo";
  return v || "activo";
}

function prettyStatus(status) {
  const v = normalizeStatus(status);
  return v === "inactivo" ? "Inactivo" : "Activo";
}

function statusBadgeClass(status) {
  const v = normalizeStatus(status);
  return v === "inactivo" ? "text-bg-secondary" : "text-bg-success";
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
    const [result, profiles] = await Promise.all([
      apiFetch("/api/admin/moderation"),
      apiFetch("/api/profiles"),
    ]);

    threads = result?.threads || [];
    replies = result?.replies || [];
    reviews = result?.reviews || [];
    tips = result?.tips || [];

    const profileRows = Array.isArray(profiles) ? profiles : [];
    profilesById = new Map(profileRows.map((p) => [String(p.id), p]));
  } catch (e) {
    showToast(
      "No se pudieron cargar datos de moderación: " + e.message,
      "danger",
    );
    threads = [];
    replies = [];
    reviews = [];
    tips = [];
    profilesById = new Map();
  }
}

function toItems() {
  const threadItems = threads.map((t) => ({
    type: "Foro",
    table: "forum_threads",
    id: t.id,
    raw: t,
    content: t.title ? `${t.title} — ${t.content || ""}` : t.content || "",
    author: resolveAuthorName(t.user_id, t.author || t.created_by),
    date: t.created_at || t.date || null,
    status: t.status || "activo",
  }));

  const reviewItems = reviews.map((r) => ({
    type: "Valoración",
    table: "reviews",
    id: r.id,
    raw: r,
    content: r.comment || r.content || "",
    author: resolveAuthorName(r.user_id, r.author),
    date: r.created_at || null,
    status: r.status || "activo",
  }));

  const replyItems = replies.map((r) => ({
    type: "Respuesta",
    table: "forum_replies",
    id: r.id,
    raw: r,
    content: r.content || "",
    author: resolveAuthorName(r.user_id, r.author || r.created_by),
    date: r.created_at || null,
    status: r.status || "activo",
  }));

  const tipItems = tips.map((t) => ({
    type: "Consejo",
    table: "tips",
    id: t.id,
    raw: t,
    content: t.title ? `${t.title} — ${t.description || ""}` : t.description || "",
    author: resolveAuthorName(t.user_id || t.created_by, t.author),
    date: t.created_at || null,
    status: t.status || "activo",
  }));

  return {
    all: [...threadItems, ...replyItems, ...reviewItems, ...tipItems],
    threadItems,
    replyItems,
    reviewItems,
    tipItems,
  };
}

function computeStats(items) {
  const total = items.length;
  const active = items.filter((i) => normalizeStatus(i.status) === "activo").length;
  const inactive = items.filter((i) => normalizeStatus(i.status) === "inactivo").length;
  const tipsCount = items.filter((i) => i.table === "tips").length;

  els.statTotal.textContent = total;
  if (els.statActive) els.statActive.textContent = active;
  if (els.statInactive) els.statInactive.textContent = inactive;
  if (els.statTips) els.statTips.textContent = tipsCount;
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
      const canDeactivate = normalizeStatus(i.status) === "activo";
      const canActivate = normalizeStatus(i.status) === "inactivo";

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
              canDeactivate
                ? `
                  <button class="btn btn-sm btn-outline-danger me-1" data-action="deactivate" data-table="${i.table}" data-id="${i.id}" title="Desactivar">
                    <i class="bi bi-slash-circle"></i>
                  </button>
                `
                : ""
            }
            ${
              canActivate
                ? `
                  <button class="btn btn-sm btn-outline-success me-1" data-action="activate" data-table="${i.table}" data-id="${i.id}" title="Reactivar">
                    <i class="bi bi-arrow-clockwise"></i>
                  </button>
                `
                : ""
            }
          </td>
        </tr>
      `;
    })
    .join("");
}

function findItem(table, id) {
  if (table === "forum_threads")
    return threads.find((t) => String(t.id) === String(id));
  if (table === "forum_replies")
    return replies.find((r) => String(r.id) === String(id));
  if (table === "reviews")
    return reviews.find((r) => String(r.id) === String(id));
  if (table === "tips")
    return tips.find((t) => String(t.id) === String(id));
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
  const { all, threadItems, replyItems, reviewItems, tipItems } = toItems();
  computeStats(all);
  renderTable(els.allTbody, all);
  renderTable(els.threadsTbody, threadItems);
  renderTable(els.repliesTbody, replyItems);
  renderTable(els.reviewsTbody, reviewItems);
  renderTable(els.tipsTbody, tipItems);
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

    if (action === "deactivate") {
      const updated = await updateStatus(table, id, "inactivo");
      if (updated) {
        showToast("Contenido desactivado.", "success");
        if (table === "forum_threads")
          threads = threads.map((t) =>
            String(t.id) === String(id) ? updated : t,
          );
        if (table === "forum_replies")
          replies = replies.map((r) =>
            String(r.id) === String(id) ? updated : r,
          );
        if (table === "reviews")
          reviews = reviews.map((r) =>
            String(r.id) === String(id) ? updated : r,
          );
        if (table === "tips")
          tips = tips.map((t) =>
            String(t.id) === String(id) ? updated : t,
          );
        rerender();
      }
      return;
    }

    if (action === "activate") {
      const updated = await updateStatus(table, id, "activo");
      if (updated) {
        showToast("Contenido reactivado.", "success");
        if (table === "forum_threads")
          threads = threads.map((t) =>
            String(t.id) === String(id) ? updated : t,
          );
        if (table === "forum_replies")
          replies = replies.map((r) =>
            String(r.id) === String(id) ? updated : r,
          );
        if (table === "reviews")
          reviews = reviews.map((r) =>
            String(r.id) === String(id) ? updated : r,
          );
        if (table === "tips")
          tips = tips.map((t) =>
            String(t.id) === String(id) ? updated : t,
          );
        rerender();
      }
      return;
    }
  };

  [els.allTbody, els.threadsTbody, els.repliesTbody, els.reviewsTbody, els.tipsTbody].forEach((tb) => {
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
