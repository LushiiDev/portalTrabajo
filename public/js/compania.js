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
    // PASO 1: Crear perfil en el backend
    console.log("Creando perfil para empresa:", data.user.id);
    try {
      const profileResponse = await fetch(`${API_BASE_URL}/api/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: data.user.id,
          full_name: nombreEmpresa,
          headline: "",
          bio: "",
          location: "",
          avatar_url: "",
          cv_url: "",
          role: ""
        })
      });

      if (!profileResponse.ok) {
        console.error("Error al crear el perfil de la empresa");
      } else {
        console.log("Perfil de empresa creado");
      }
    } catch (err) {
      console.error("Error al conectar con el backend (perfil):", err);
    }

    // PASO 2: Crear registro de empresa en el backend
    console.log("Creando datos de empresa:", data.user.id);
    try {
      const companyResponse = await fetch(`${API_BASE_URL}/api/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: data.user.id,
          name: nombreEmpresa,
          description: "",
          logo_url: "",
          website: sitioWeb,
          sector: "",
          size: "",
          founded_year: null,
          location: "",
          linkedin_url: "",
          facebook_url: "",
          NIT: nit
        })
      });

      if (!companyResponse.ok) {
        console.error("Error al crear la empresa en el backend");
      } else {
        console.log("Empresa creada exitosamente");
      }
    } catch (err) {
      console.error("Error al conectar con el backend (empresa):", err);
    }

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

// ─── Obtener datos de empresa por usuario ID ──────────────────────────────

async function obtenerDatosEmpresa(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/companies`);
    if (!response.ok) throw new Error("Error al obtener empresas");
    
    const companies = await response.json();
    const empresa = companies.find(c => c.user_id === userId);
    
    return empresa || null;
  } catch (err) {
    console.error("Error al obtener datos de empresa:", err);
    return null;
  }
}

// ─── Actualizar datos de empresa ───────────────────────────────────────────

async function actualizarDatosEmpresa(companyId, datosEmpresa) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datosEmpresa)
    });

    if (!response.ok) {
      throw new Error("Error al actualizar empresa");
    }

    return await response.json();
  } catch (err) {
    console.error("Error al actualizar empresa:", err);
    alert("Error al actualizar datos de la empresa");
    return null;
  }
}
