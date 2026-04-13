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
const demoMode = isDemoMode();

function normalizeRole(role) {
  const v = String(role || "").toLowerCase();
  if (v.includes("admin")) return "admin";
  if (v.includes("emple") || v.includes("company") || v.includes("empresa")) return "empleador";
  if (v.includes("cand") || v.includes("user") || v.includes("usuario")) return "candidato";
  return v || "candidato";
}

function prettyRole(role) {
  const v = normalizeRole(role);
  return v === "admin" ? "Admin" : v === "empleador" ? "Empleador" : "Candidato";
}

function normalizeStatus(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("susp") || v.includes("ban") || v.includes("block")) return "suspendido";
  if (v.includes("act") || v.includes("ok")) return "activo";
  return v || "activo";
}

function prettyStatus(status) {
  const v = normalizeStatus(status);
  return v === "suspendido" ? "Suspendido" : "Activo";
}

async function loadUsers() {
  if (demoMode) {
    // Mock data to visualize the layout without login / database access
    allUsers = [
      {
        id: "u1",
        table: "profiles",
        raw: {
          id: "u1",
          full_name: "Juan Pérez",
          email: "juan@email.com",
          role: "candidato",
          status: "activo",
          created_at: "2026-01-15T10:00:00Z",
          last_sign_in_at: "2026-03-14T12:00:00Z",
        },
        nombre: "Juan Pérez",
        email: "juan@email.com",
        rol: "candidato",
        estado: "activo",
        registro: "2026-01-15T10:00:00Z",
        ultimo: "2026-03-14T12:00:00Z",
      },
      {
        id: "u2",
        table: "companies",
        raw: {
          id: "u2",
          name: "María García",
          email: "maria@email.com",
          role: "empleador",
          status: "activo",
          created_at: "2026-01-20T10:00:00Z",
          last_sign_in_at: "2026-03-15T12:00:00Z",
        },
        nombre: "María García",
        email: "maria@email.com",
        rol: "empleador",
        estado: "activo",
        registro: "2026-01-20T10:00:00Z",
        ultimo: "2026-03-15T12:00:00Z",
      },
      {
        id: "u3",
        table: "profiles",
        raw: {
          id: "u3",
          full_name: "Carlos López",
          email: "carlos@email.com",
          role: "candidato",
          status: "suspendido",
          created_at: "2026-02-05T10:00:00Z",
          last_sign_in_at: "2026-03-10T12:00:00Z",
        },
        nombre: "Carlos López",
        email: "carlos@email.com",
        rol: "candidato",
        estado: "suspendido",
        registro: "2026-02-05T10:00:00Z",
        ultimo: "2026-03-10T12:00:00Z",
      },
      {
        id: "u4",
        table: "companies",
        raw: {
          id: "u4",
          name: "Ana Martínez",
          email: "ana@email.com",
          role: "empleador",
          status: "activo",
          created_at: "2026-02-12T10:00:00Z",
          last_sign_in_at: "2026-03-16T12:00:00Z",
        },
        nombre: "Ana Martínez",
        email: "ana@email.com",
        rol: "empleador",
        estado: "activo",
        registro: "2026-02-12T10:00:00Z",
        ultimo: "2026-03-16T12:00:00Z",
      },
      {
        id: "u5",
        table: "profiles",
        raw: {
          id: "u5",
          full_name: "Pedro Sánchez",
          email: "pedro@email.com",
          role: "candidato",
          status: "activo",
          created_at: "2026-02-25T10:00:00Z",
          last_sign_in_at: "2026-03-15T12:00:00Z",
        },
        nombre: "Pedro Sánchez",
        email: "pedro@email.com",
        rol: "candidato",
        estado: "activo",
        registro: "2026-02-25T10:00:00Z",
        ultimo: "2026-03-15T12:00:00Z",
      },
    ];
    return;
  }

  // profiles => candidatos
  const profilesReq = supabaseClient.from("profiles").select("*");
  // companies => empleadores
  const companiesReq = supabaseClient.from("companies").select("*");

  const [{ data: profiles, error: pErr }, { data: companies, error: cErr }] = await Promise.all([
    profilesReq,
    companiesReq,
  ]);

  if (pErr) showToast("No se pudieron cargar profiles: " + pErr.message, "danger");
  if (cErr) showToast("No se pudieron cargar companies: " + cErr.message, "danger");

  const list = [];

  (profiles || []).forEach((p) => {
    list.push({
      id: p.id,
      table: "profiles",
      raw: p,
      nombre: p.full_name || p.name || p.nombre || "Sin nombre",
      email: p.email || "-",
      rol: p.role || "candidato",
      estado: p.status || p.estado || "activo",
      registro: p.created_at || p.createdAt || null,
      ultimo: p.last_sign_in_at || p.last_login_at || null,
    });
  });

  (companies || []).forEach((c) => {
    list.push({
      id: c.id,
      table: "companies",
      raw: c,
      nombre: c.name || c.nombre_empresa || "Empresa",
      email: c.email || "-",
      rol: "empleador",
      estado: c.status || c.estado || "activo",
      registro: c.created_at || null,
      ultimo: c.last_sign_in_at || null,
    });
  });

  allUsers = list;
}

function computeStats(users) {
  const total = users.length;
  const active = users.filter((u) => normalizeStatus(u.estado) === "activo").length;
  const suspended = users.filter((u) => normalizeStatus(u.estado) === "suspendido").length;
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
      String(u.nombre || "").toLowerCase().includes(q) ||
      String(u.email || "").toLowerCase().includes(q) ||
      String(u.rol || "").toLowerCase().includes(q);

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
      const roleCls = normalizeRole(u.rol) === "candidato" ? "badge-role gray" : "badge-role";
      const status = prettyStatus(u.estado);
      const statusCls = normalizeStatus(u.estado) === "suspendido" ? "badge-status red" : "badge-status";
      const reg = formatDate(u.registro);
      const last = u.ultimo ? formatDate(u.ultimo) : "-";

      const toggleLabel = normalizeStatus(u.estado) === "suspendido" ? "Activar" : "Suspender";
      const toggleIcon = normalizeStatus(u.estado) === "suspendido" ? "bi-unlock" : "bi-slash-circle";
      const toggleBtnCls = normalizeStatus(u.estado) === "suspendido" ? "btn-ok" : "btn-warn";

      return `
        <tr>
          <td class="fw-semibold">${escapeHtml(u.nombre)}</td>
          <td class="text-muted">${escapeHtml(u.email || "-")}</td>
          <td><span class="badge-soft ${roleCls}">${escapeHtml(role)}</span></td>
          <td><span class="badge-soft ${statusCls}">${escapeHtml(status)}</span></td>
          <td class="text-muted">${escapeHtml(reg)}</td>
          <td class="text-muted">${escapeHtml(last)}</td>
          <td class="text-end">
            <button class="btn-action btn-view me-1" data-action="view" data-id="${u.id}" title="Ver">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn-action ${toggleBtnCls} me-1" data-action="toggle" data-id="${u.id}" title="${toggleLabel}">
              <i class="bi ${toggleIcon}"></i>
            </button>
            <button class="btn-action btn-danger" data-action="delete" data-id="${u.id}" title="Eliminar">
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
  if (demoMode) {
    showToast("Modo demo: acción deshabilitada.", "info");
    return;
  }
  // If the table doesn't have "status" column, this will fail and we show a clear message.
  const next = normalizeStatus(user.estado) === "suspendido" ? "activo" : "suspendido";

  const { data, error } = await supabaseClient
    .from(user.table)
    .update({ status: next })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    showToast(
      `No se pudo actualizar el estado en ${user.table}. ` +
        `Necesitas una columna 'status' (o actualizar el código al nombre real). Detalle: ${error.message}`,
      "warning",
    );
    return;
  }

  user.raw = data;
  user.estado = data.status || data.estado || next;
  showToast("Estado actualizado: " + prettyStatus(user.estado), "success");
}

async function deleteUser(user) {
  if (demoMode) {
    showToast("Modo demo: acción deshabilitada.", "info");
    return;
  }
  const ok = confirm(
    `¿Eliminar este registro de ${user.table}?\n` +
      `Esto NO borra el usuario de Supabase Auth (para eso necesitas Service Role en backend).`,
  );
  if (!ok) return;

  const { error } = await supabaseClient.from(user.table).delete().eq("id", user.id);
  if (error) {
    showToast("No se pudo eliminar: " + error.message, "danger");
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
