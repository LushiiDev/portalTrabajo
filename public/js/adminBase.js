const SUPABASE_URL = "https://unyqdgntdqwauzckzoky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vaV2z3ugubTKsqcbgk8prw_wTWQsXJS";
export const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

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
  return data.session;
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

  const meta = session?.user?.user_metadata || {};
  const isAdmin =
    meta.role === "admin" ||
    meta.tipo_cuenta === "admin" ||
    meta.is_admin === true;

  if (isAdmin) {
    banner.classList.add("d-none");
    return;
  }

  banner.classList.remove("d-none");
  banner.textContent =
    "Aviso: este usuario no tiene rol admin en Supabase. Las acciones de admin pueden fallar si no tiene permisos.";
}

function renderSessionInfo(session) {
  const info = document.getElementById("adminSessionInfo");
  if (!info) return;

  const user = session?.user || {};
  const userMeta = user.user_metadata || {};
  const appMeta = user.app_metadata || {};
  const role =
    userMeta.role ||
    userMeta.tipo_cuenta ||
    appMeta.role ||
    appMeta.tipo_cuenta ||
    (userMeta.is_admin ? "admin" : "");

  const who = user.email || user.id || "usuario sin identificar";
  info.textContent = role
    ? `Sesión activa: ${who} | Rol: ${role}`
    : `Sesión activa: ${who}`;
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
  const preEl = document.getElementById("jsonModalPre");
  if (!modalEl || !titleEl || !preEl || !window.bootstrap?.Modal) return;

  titleEl.textContent = title;
  preEl.textContent = JSON.stringify(obj, null, 2);

  window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
}
