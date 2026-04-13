const SUPABASE_URL = "https://unyqdgntdqwauzckzoky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vaV2z3ugubTKsqcbgk8prw_wTWQsXJS";
export const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

export function isDemoMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") return true;
  } catch {
    // ignore
  }
  return false;
}

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
  // Demo mode: allow opening the admin pages without login just to see the layout.
  if (isDemoMode()) {
    return {
      user: {
        id: "demo-user",
        email: "demo@localhost",
        user_metadata: { role: "admin", tipo_cuenta: "admin" },
      },
    };
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data?.session) {
    window.location.href = "./registroUsuario.html";
    return null;
  }
  return data.session;
}

export function setActiveSidebar(hrefSuffix) {
  const links = document.querySelectorAll(".admin-nav a");
  links.forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    a.classList.toggle("active", href.endsWith(hrefSuffix.toLowerCase()));
  });
}

export function ensureAdminBanner(session) {
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
    "Aviso: este usuario no tiene un rol 'admin' en Supabase (user_metadata). La UI funciona en modo demo; el backend/RLS debería bloquear acciones no autorizadas.";
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
