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

setActiveSidebar("adminusuarios.html");

const els = {
  tbody: document.getElementById("usersTbody"),
  search: document.getElementById("searchInput"),
  roleFilter: document.getElementById("roleFilter"),
  statusFilter: document.getElementById("statusFilter"),
  statTotal: document.getElementById("statTotal"),
  statActive: document.getElementById("statActive"),
  statSuspended: document.getElementById("statSuspended"),
  statNew30: document.getElementById("statNew30"),
};

let allUsers = [];

function normalizeRole(role) {
  const v = String(role || "").toLowerCase();
  if (v.includes("admin")) return "admin";
  if (v.includes("emple") || v.includes("company") || v.includes("empresa"))
    return "empleador";
  if (v.includes("cand") || v.includes("user") || v.includes("usuario"))
    return "candidato";
  return v || "candidato";
}

function prettyRole(role) {
  const v = normalizeRole(role);
  return v === "admin"
    ? "Admin"
    : v === "empleador"
      ? "Empleador"
      : "Candidato";
}

function normalizeStatus(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("susp") || v.includes("ban") || v.includes("block"))
    return "suspendido";
  if (v.includes("act") || v.includes("ok")) return "activo";
  return v || "activo";
}

function prettyStatus(status) {
  const v = normalizeStatus(status);
  return v === "suspendido" ? "Suspendido" : "Activo";
}

async function loadUsers() {
  try {
    const result = await apiFetch("/api/admin/users");
    const users = result?.users || [];
    allUsers = users.map((u) => ({
      id: u.id,
      table: u.table,
      raw: u.raw,
      nombre: u.name,
      email: u.email || "-",
      rol: u.role,
      estado: u.status,
      registro: u.created_at,
      ultimo: u.last_sign_in_at,
    }));
  } catch (e) {
    showToast("No se pudieron cargar usuarios: " + e.message, "danger");
    allUsers = [];
  }
}

function computeStats(users) {
  const total = users.length;
  const active = users.filter(
    (u) => normalizeStatus(u.estado) === "activo",
  ).length;
  const suspended = users.filter(
    (u) => normalizeStatus(u.estado) === "suspendido",
  ).length;
  const new30 = users.filter((u) => {
    const d = daysAgo(u.registro);
    return d !== null && d <= 30;
  }).length;

  els.statTotal.textContent = total;
  els.statActive.textContent = active;
  els.statSuspended.textContent = suspended;
  els.statNew30.textContent = new30;
}

function applyFilters(users) {
  const q = (els.search.value || "").trim().toLowerCase();
  const role = (els.roleFilter.value || "").trim().toLowerCase();
  const status = (els.statusFilter.value || "").trim().toLowerCase();

  return users.filter((u) => {
    const matchesQ =
      !q ||
      String(u.nombre || "")
        .toLowerCase()
        .includes(q) ||
      String(u.email || "")
        .toLowerCase()
        .includes(q) ||
      String(u.rol || "")
        .toLowerCase()
        .includes(q);

    const matchesRole = !role || normalizeRole(u.rol) === role;
    const matchesStatus = !status || normalizeStatus(u.estado) === status;
    return matchesQ && matchesRole && matchesStatus;
  });
}

function render(users) {
  if (!els.tbody) return;

  if (!users.length) {
    els.tbody.innerHTML = `<tr><td colspan="7" class="text-muted">No hay resultados.</td></tr>`;
    return;
  }

  els.tbody.innerHTML = users
    .map((u) => {
      const role = prettyRole(u.rol);
      const roleCls =
        normalizeRole(u.rol) === "candidato"
          ? "text-bg-secondary"
          : normalizeRole(u.rol) === "admin"
            ? "text-bg-danger"
            : "text-bg-primary";
      const status = prettyStatus(u.estado);
      const statusCls =
        normalizeStatus(u.estado) === "suspendido"
          ? "text-bg-warning"
          : "text-bg-success";
      const reg = formatDate(u.registro);
      const last = u.ultimo ? formatDate(u.ultimo) : "-";

      const toggleLabel =
        normalizeStatus(u.estado) === "suspendido" ? "Activar" : "Suspender";
      const toggleIcon =
        normalizeStatus(u.estado) === "suspendido"
          ? "bi-unlock"
          : "bi-slash-circle";
      const toggleBtnCls =
        normalizeStatus(u.estado) === "suspendido"
          ? "btn-success"
          : "btn-warning";

      return `
        <tr>
          <td class="fw-semibold">${escapeHtml(u.nombre)}</td>
          <td class="text-muted">${escapeHtml(u.email || "-")}</td>
          <td><span class="badge rounded-pill ${roleCls}">${escapeHtml(role)}</span></td>
          <td><span class="badge rounded-pill ${statusCls}">${escapeHtml(status)}</span></td>
          <td class="text-muted">${escapeHtml(reg)}</td>
          <td class="text-muted">${escapeHtml(last)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" data-action="view" data-id="${u.id}" title="Ver">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm ${toggleBtnCls} me-1" data-action="toggle" data-id="${u.id}" title="${toggleLabel}">
              <i class="bi ${toggleIcon}"></i>
            </button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${u.id}" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getById(id) {
  return allUsers.find((u) => u.id === id);
}

async function toggleUserStatus(user) {
  const next =
    normalizeStatus(user.estado) === "suspendido" ? "activo" : "suspendido";

  try {
    const updated = await apiFetch(
      `/api/admin/users/${user.table}/${user.id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      },
    );
    user.raw = updated;
    user.estado = updated.status || updated.estado || next;
  } catch (e) {
    showToast(
      `No se pudo actualizar el estado en ${user.table}. Detalle: ${e.message}`,
      "warning",
    );
    return;
  }
  showToast("Estado actualizado: " + prettyStatus(user.estado), "success");
}

async function deleteUser(user) {
  const ok = confirm(
    `¿Eliminar este registro de ${user.table}?\n` +
      `Esto NO borra el usuario de Supabase Auth (para eso necesitas Service Role en backend).`,
  );
  if (!ok) return;

  try {
    await apiFetch(`/api/admin/users/${user.table}/${user.id}`, {
      method: "DELETE",
    });
  } catch (e) {
    showToast("No se pudo eliminar: " + e.message, "danger");
    return;
  }
  allUsers = allUsers.filter((u) => u.id !== user.id);
  showToast("Eliminado correctamente.", "success");
}

function rerender() {
  computeStats(allUsers);
  const filtered = applyFilters(allUsers);
  render(filtered);
}

function wireEvents() {
  [els.search, els.roleFilter, els.statusFilter].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", rerender);
    el.addEventListener("change", rerender);
  });

  if (els.tbody) {
    els.tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      const user = getById(id);
      if (!user) return;

      if (action === "view") {
        openJsonModal(`Detalle (${user.table})`, user.raw);
        return;
      }
      if (action === "toggle") {
        await toggleUserStatus(user);
        rerender();
        return;
      }
      if (action === "delete") {
        await deleteUser(user);
        rerender();
        return;
      }
    });
  }
}

async function init() {
  wireEvents();
  const session = await requireSession();
  if (!session) return;
  ensureAdminBanner(session);

  await loadUsers();
  rerender();
}

document.addEventListener("DOMContentLoaded", init);
