const SUPABASE_URL = "https://unyqdgntdqwauzckzoky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vaV2z3ugubTKsqcbgk8prw_wTWQsXJS";
const API_BASE_URL = "http://127.0.0.1:3000";
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

const path = window.location.pathname.toLowerCase();
const isAuthPage = path.endsWith("/registrousuario.html");
const isForosPage = path.endsWith("/foros.html");
const isDetailPage = path.endsWith("/detalle.html");
const isIndexPage = path.endsWith("/index.html") || path.endsWith("/public/");
const isAppPage = isIndexPage || isForosPage || isDetailPage;
const isDashboardEmpresa = path.endsWith("/dashboardempresa.html");

function actualizarEstadoCampos(contenedor, habilitar) {
  const inputs = contenedor.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    input.disabled = !habilitar;
    input.required = habilitar;
  });
}

// ─── Crear perfil de usuario en el backend ─────────────────────────────────

async function crearPerfilUsuario(userId, nombre, apellido) {
  try {
    const payload = {
      id: userId,
      full_name: `${nombre} ${apellido}`,
      headline: "",
      bio: "",
      location: "",
      avatar_url: "",
      cv_url: "",
      role: ""
    };

    const response = await fetch(`${API_BASE_URL}/api/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      return false;
    }

    await response.json();
    return true;
  } catch (err) {
    console.error("Error al conectar con el backend:", err);
    return false;
  }
}

async function actualizarNavbarAuth() {
  const authActions = document.getElementById("authActions");
  const userMenu = document.getElementById("userMenu");
  const userEmailLabel = document.getElementById("userEmailLabel");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!authActions || !userMenu) return;

  const { data, error } = await supabaseClient.auth.getSession();
  const session = data?.session;

  if (error || !session) {
    authActions.classList.remove("d-none");
    userMenu.classList.add("d-none");
    return;
  }

  authActions.classList.add("d-none");
  userMenu.classList.remove("d-none");

  const meta = session.user?.user_metadata || {};
  const label = meta.nombre_empresa || meta.nombre || session.user?.email || "Usuario";
  if (userEmailLabel) userEmailLabel.textContent = label;

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabaseClient.auth.signOut();
      window.location.href = "./registroUsuario.html";
    };
  }
}

function initAuthPage() {
  const regUsuario = document.getElementById("regUsuario");
  const regEmpresa = document.getElementById("regEmpresa");
  const camposUsuario = document.getElementById("camposUsuario");
  const camposEmpresa = document.getElementById("camposEmpresa");

  if (regUsuario && regEmpresa && camposUsuario && camposEmpresa) {
    function actualizarCamposRegistro() {
      const esUsuario = regUsuario.checked;
      camposUsuario.classList.toggle("d-none", !esUsuario);
      camposEmpresa.classList.toggle("d-none", esUsuario);
      actualizarEstadoCampos(camposUsuario, esUsuario);
      actualizarEstadoCampos(camposEmpresa, !esUsuario);
    }
    regUsuario.addEventListener("change", actualizarCamposRegistro);
    regEmpresa.addEventListener("change", actualizarCamposRegistro);
    actualizarCamposRegistro();
  }

  // ── REGISTRO ──────────────────────────────────────────────────────────────
  const registroForm = document.getElementById("registroForm");
  if (registroForm) {
    registroForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(registroForm);

      if (regEmpresa && regEmpresa.checked) {
        const ok = await registrarEmpresa(formData);
        if (ok) registroForm.reset();
        return;
      }

      const nombre   = (formData.get("nombre")   || "").trim();
      const apellido = (formData.get("apellido") || "").trim();
      const email    = (formData.get("email")    || "").trim();
      const password = formData.get("password")  || "";
      const confirmar = formData.get("confirmar") || "";
      const terminos  = formData.get("terminos");

      if (!nombre || !apellido || !email || !password || !confirmar) {
        alert("Completa todos los campos obligatorios."); return;
      }
      if (password !== confirmar) { alert("Las contraseñas no coinciden."); return; }
      if (password.length < 6)   { alert("La contraseña debe tener al menos 6 caracteres."); return; }
      if (!terminos)              { alert("Debes aceptar los términos y condiciones."); return; }

      const { data, error } = await supabaseClient.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: window.location.href,
          data: { tipo_cuenta: "usuario", nombre, apellido },
        },
      });

      if (error) { alert("Error al registrarte: " + error.message); return; }
      if (data?.user) {
        // Crear perfil en el backend
        await crearPerfilUsuario(data.user.id, nombre, apellido);
        
        alert("Registro exitoso. Revisa tu correo para confirmar la cuenta.");
        registroForm.reset();
      } else {
        alert("No se pudo crear el usuario.");
      }
    });
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const loginForm = document.getElementById("loginForm");
  // ⚠️ Renombradas para no pisar las funciones de compania.js
  const radioLoginUsuario = document.getElementById("loginUsuario");
  const radioLoginEmpresa = document.getElementById("loginEmpresa");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const email    = (formData.get("email")    || "").trim();
      const password = formData.get("password")  || "";

      if (!email || !password) { alert("Completa correo y contraseña."); return; }

      // Login EMPRESA → función loginEmpresa() viene de compania.js
      if (radioLoginEmpresa && radioLoginEmpresa.checked) {
        await loginEmpresa(email, password);
        return;
      }

      // Login USUARIO
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) { alert("Error al iniciar sesión: " + error.message); return; }

      const tipoCuenta = data?.user?.user_metadata?.tipo_cuenta || "usuario";

      if (tipoCuenta === "empresa") {
        await supabaseClient.auth.signOut();
        alert("Esta cuenta es de una Empresa. Selecciona 'Empresa' para iniciar sesión.");
        return;
      }

      window.location.href = document.referrer || "./index.html";
    });
  }
}

if (isAuthPage) initAuthPage();

if (isAppPage) {
  actualizarNavbarAuth();
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") actualizarNavbarAuth();
  });
}

if (isDashboardEmpresa) {
  actualizarNavbarEmpresa();
}
