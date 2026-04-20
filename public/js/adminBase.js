const SUPABASE_URL = "https://unyqdgntdqwauzckzoky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vaV2z3ugubTKsqcbgk8prw_wTWQsXJS";
export const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

let adminCheckCache = {
  userId: null,
  isAdmin: null,
};

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysAgo(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export async function requireSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data?.session) {
    window.location.href = "./registroUsuario.html";
    return null;
  }

  const isAdmin = await validateAdminSession(data.session);
  if (!isAdmin) {
    await supabaseClient.auth.signOut();
    alert("Acceso denegado: este usuario no tiene permisos de administrador.");
    window.location.href = "./index.html";
    return null;
  }

  return data.session;
}

async function validateAdminSession(session) {
  const user = session?.user;
  if (!user?.id) return false;

  if (adminCheckCache.userId === user.id && adminCheckCache.isAdmin !== null) {
    return adminCheckCache.isAdmin;
  }

  const token = session.access_token;
  if (!token) {
    adminCheckCache = { userId: user.id, isAdmin: false };
    return false;
  }

  try {
    const response = await fetch(resolveApiUrl("/api/admin/users"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const isAdmin = response.ok;
    adminCheckCache = { userId: user.id, isAdmin };
    return isAdmin;
  } catch {
    adminCheckCache = { userId: user.id, isAdmin: false };
    return false;
  }
}

export async function apiFetch(path, options = {}) {
  const session = await requireSession();
  if (!session) {
    throw new Error("No hay sesión activa.");
  }

  const accessToken = session.access_token;
  const headers = new Headers(options.headers || {});
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(resolveApiUrl(path), {
    ...options,
    headers,
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    let message =
      (data && typeof data === "object" && (data.message || data.error)) ||
      response.statusText ||
      "Error en la API";

    // Helpful hint when admin pages are opened from a different port (e.g. Live Server).
    if (
      response.status === 404 &&
      typeof path === "string" &&
      path.startsWith("/api/") &&
      isLocalhost() &&
      window.location.port &&
      window.location.port !== "3000"
    ) {
      message += " (parece que abriste el frontend en otro puerto; usa http://localhost:3000 o configura API_BASE_URL)";
    }

    message = `${response.status}: ${message}`;
    throw new Error(message);
  }
  return data;
}

function isLocalhost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function resolveApiUrl(path) {
  if (typeof path !== "string") return path;
  if (/^https?:\/\//i.test(path)) return path;

  const override = window.localStorage?.getItem("API_BASE_URL") || "";
  if (override) return new URL(path, override).toString();

  // If frontend is served from another localhost port (e.g. 5500), call backend on 3000.
  if (isLocalhost() && window.location.port && window.location.port !== "3000") {
    return new URL(path, "http://localhost:3000").toString();
  }

  return path;
}

export function setActiveSidebar(hrefSuffix) {
  const links = document.querySelectorAll(".admin-nav a");
  links.forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    a.classList.toggle("active", href.endsWith(hrefSuffix.toLowerCase()));
  });
}

export function ensureAdminBanner(session) {
  renderSessionInfo(session);

  const banner = document.getElementById("adminBanner");
  if (!banner) return;

  banner.classList.remove("d-none");
  banner.classList.add("d-none");
}

function renderSessionInfo(session) {
  const info = document.getElementById("adminSessionInfo");
  if (!info) return;

  const user = session?.user || {};
  const who = user.email || user.id || "usuario sin identificar";
  info.textContent = `Sesión activa: ${who}`;
}

export function showToast(message, type = "info") {
  const el = document.getElementById("adminToast");
  const body = document.getElementById("adminToastBody");
  if (!el || !body || !window.bootstrap?.Toast) {
    alert(message);
    return;
  }

  el.classList.remove(
    "text-bg-success",
    "text-bg-danger",
    "text-bg-warning",
    "text-bg-info",
  );
  const cls =
    type === "success"
      ? "text-bg-success"
      : type === "danger"
        ? "text-bg-danger"
        : type === "warning"
          ? "text-bg-warning"
          : "text-bg-info";
  el.classList.add(cls);

  body.textContent = message;
  window.bootstrap.Toast.getOrCreateInstance(el, { delay: 3000 }).show();
}

export function openJsonModal(title, obj) {
  const modalEl = document.getElementById("jsonModal");
  const titleEl = document.getElementById("jsonModalTitle");
  const bodyEl = document.getElementById("jsonModalBody");
  if (!modalEl || !titleEl || !bodyEl || !window.bootstrap?.Modal) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = renderDetailRows(obj);

  window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function renderDetailRows(value, depth = 0, seen = new WeakSet()) {
  if (!value || typeof value !== "object") {
    return `<div class="text-muted">Sin datos disponibles.</div>`;
  }

  if (seen.has(value)) {
    return `<span class="text-muted">[Referencia circular]</span>`;
  }
  seen.add(value);

  const entries = Object.entries(value);
  if (!entries.length) {
    return `<div class="text-muted">Sin datos disponibles.</div>`;
  }

  const rows = entries
    .map(([key, raw]) => {
      return `
        <tr>
          <th class="w-25 text-secondary text-capitalize align-top">${escapeHtml(prettyFieldName(key))}</th>
          <td class="text-break">${renderFieldValue(raw, depth + 1, seen)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table class="table table-sm table-striped align-top mb-0">
      <tbody>${rows}</tbody>
    </table>
  `;
}

function prettyFieldName(key) {
  return String(key || "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderFieldValue(value, depth, seen) {
  if (value === null || value === undefined || value === "") {
    return `<span class="text-muted">-</span>`;
  }

  if (typeof value !== "object") {
    return escapeHtml(formatFieldValue(value));
  }

  if (Array.isArray(value)) {
    if (!value.length) return `<span class="text-muted">[]</span>`;
    if (depth >= 3) return `<code>${escapeHtml(JSON.stringify(value))}</code>`;

    const items = value
      .map((item, idx) => {
        if (item && typeof item === "object") {
          return `
            <div class="border rounded p-2">
              <div class="small text-muted mb-1">Ítem ${idx + 1}</div>
              ${renderDetailRows(item, depth + 1, seen)}
            </div>
          `;
        }
        return `<li>${escapeHtml(formatFieldValue(item))}</li>`;
      })
      .join("");

    if (items.includes("<li>")) {
      return `<ul class="mb-0 ps-3">${items}</ul>`;
    }
    return `<div class="d-flex flex-column gap-2">${items}</div>`;
  }

  if (depth >= 3) {
    return `<code>${escapeHtml(JSON.stringify(value))}</code>`;
  }

  return `<div class="border rounded p-2 bg-light-subtle">${renderDetailRows(value, depth + 1, seen)}</div>`;
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
