// ─── Registro de Empresa ───────────────────────────────────────────────────

async function registrarEmpresa(formData) {
  const nombreUsuario = (formData.get("nombreUsuario") || "").trim();
  const nombreEmpresa = (formData.get("nombreEmpresa") || "").trim();
  const nit = (formData.get("ruc") || "").trim();
  const sitioWeb = (formData.get("sitioWeb") || "").trim();
  const email = (formData.get("email") || "").trim();
  const password = formData.get("password") || "";
  const confirmar = formData.get("confirmar") || "";
  const terminos = formData.get("terminos");

  // Validaciones
  if (!nombreUsuario || !nombreEmpresa || !email || !password || !confirmar) {
    alert("Completa todos los campos obligatorios.");
    return false;
  }

  if (password !== confirmar) {
    alert("Las contraseñas no coinciden.");
    return false;
  }

  if (password.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres.");
    return false;
  }

  if (!terminos) {
    alert("Debes aceptar los términos y condiciones.");
    return false;
  }

  // Registro en Supabase Auth
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.href,
      data: {
        tipo_cuenta: "empresa",
        nombre_usuario: nombreUsuario,
        nombre_empresa: nombreEmpresa,
        nit: nit,
        sitio_web: sitioWeb,
      },
    },
  });

  if (error) {
    alert("Error al registrar la empresa: " + error.message);
    return false;
  }

  if (data?.user) {
    alert(
      "¡Empresa registrada exitosamente! Revisa tu correo para confirmar la cuenta."
    );
    return true;
  }

  alert("No se pudo crear la cuenta. Intenta de nuevo.");
  return false;
}

// ─── Login de Empresa ──────────────────────────────────────────────────────

async function loginEmpresa(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Error al iniciar sesión: " + error.message);
    return false;
  }

  const tipoCuenta = data?.user?.user_metadata?.tipo_cuenta;

  if (tipoCuenta !== "empresa") {
    await supabaseClient.auth.signOut();
    alert("Esta cuenta no es de tipo Empresa. Usa la opción 'Usuario' para cuentas personales.");
    return false;
  }

  // Redirigir al dashboard de empresa
  window.location.href = "./dashBoardEmpresa.html";
  return true;
}

// ─── Verificar sesión activa de empresa ───────────────────────────────────

async function verificarSesionEmpresa() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    window.location.href = "./registroUsuario.html";
    return null;
  }

  const tipoCuenta = data.session.user?.user_metadata?.tipo_cuenta;

  if (tipoCuenta !== "empresa") {
    await supabaseClient.auth.signOut();
    window.location.href = "./registroUsuario.html";
    return null;
  }

  return data.session;
}

// ─── Actualizar navbar en páginas de empresa ──────────────────────────────

async function actualizarNavbarEmpresa() {
  const { data } = await supabaseClient.auth.getSession();
  const session = data?.session;
  if (!session) return;

  const nombreEmpresa =
    session.user?.user_metadata?.nombre_empresa ||
    session.user?.email ||
    "Empresa";

  const userEmailLabel = document.getElementById("userEmailLabel");
  if (userEmailLabel) userEmailLabel.textContent = nombreEmpresa;

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabaseClient.auth.signOut();
      window.location.href = "./registroUsuario.html";
    };
  }
}
