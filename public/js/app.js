const SUPABASE_URL = "https://unyqdgntdqwauzckzoky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vaV2z3ugubTKsqcbgk8prw_wTWQsXJS";
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

const path = window.location.pathname.toLowerCase();
const isAuthPage = path.endsWith("/registrousuario.html");
const isIndexPage = path.endsWith("/index.html") || path.endsWith("/public/");

function actualizarEstadoCampos(contenedor, habilitar) {
  const inputs = contenedor.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    input.disabled = !habilitar;
    input.required = habilitar;
  });
}

async function validarSesionEnIndex() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) {
    window.location.href = "./registroUsuario.html";
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

  const email = session.user?.email || "Usuario";
  if (userEmailLabel) userEmailLabel.textContent = email;

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

  const registroForm = document.getElementById("registroForm");
  if (registroForm) {
    registroForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (regUsuario && !regUsuario.checked) {
        alert("Por ahora solo está habilitado el registro de Usuario.");
        return;
      }

      const formData = new FormData(registroForm);
      const nombre = (formData.get("nombre") || "").trim();
      const apellido = (formData.get("apellido") || "").trim();
      const email = (formData.get("email") || "").trim();
      const password = formData.get("password") || "";
      const confirmar = formData.get("confirmar") || "";
      const terminos = formData.get("terminos");

      if (!nombre || !apellido || !email || !password || !confirmar) {
        alert("Completa todos los campos obligatorios.");
        return;
      }

      if (password !== confirmar) {
        alert("Las contraseñas no coinciden.");
        return;
      }

      if (!terminos) {
        alert("Debes aceptar los términos y condiciones.");
        return;
      }

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "http://127.0.0.1:5500/public/registroUsuario.html",
          data: {
            tipo_cuenta: "usuario",
            nombre,
            apellido,
          },
        },
      });

      if (error) {
        alert("Error al registrarte: " + error.message);
        return;
      }

      if (data?.user) {
        alert("Registro exitoso. Revisa tu correo para confirmar la cuenta.");
        registroForm.reset();
      } else {
        alert("No se pudo crear el usuario.");
      }
    });
  }

  const loginForm = document.getElementById("loginForm");
  const loginUsuario = document.getElementById("loginUsuario");
  const loginEmpresa = document.getElementById("loginEmpresa");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(loginForm);
      const email = (formData.get("email") || "").trim();
      const password = formData.get("password") || "";

      if (!email || !password) {
        alert("Completa correo y contraseña.");
        return;
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert("Error al iniciar sesión: " + error.message);
        return;
      }

      const tipoCuenta = data?.user?.user_metadata?.tipo_cuenta || "usuario";

      if (loginEmpresa && loginEmpresa.checked && tipoCuenta !== "empresa") {
        await supabaseClient.auth.signOut();
        alert("Esta cuenta no es de tipo empresa.");
        return;
      }

      if (loginUsuario && loginUsuario.checked && tipoCuenta !== "usuario") {
        await supabaseClient.auth.signOut();
        alert("Esta cuenta no es de tipo usuario.");
        return;
      }

      window.location.href = "./index.html";
    });
  }
}

if (isAuthPage) {
  initAuthPage();
}

if (isIndexPage) {
  actualizarNavbarAuth();

  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
      actualizarNavbarAuth();
    }
  });
}
