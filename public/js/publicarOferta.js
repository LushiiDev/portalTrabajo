async function initPublicarOfertaPage() {
  const form = document.getElementById("publishJobForm");
  if (!form) {
    return;
  }

  const cancelBtn = document.getElementById("cancelPublishBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      window.location.href = "./dashBoardEmpresa.html";
    });
  }

  const session = await verificarSesionEmpresa();
  if (!session) {
    return;
  }

  const company = await obtenerDatosEmpresa(session.user.id);
  if (!company?.id) {
    alert("No encontramos datos de empresa para esta cuenta. Completa primero el registro de empresa.");
    window.location.href = "./perfilEmpresa.html";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const title = (formData.get("title") || "").toString().trim();
    const description = (formData.get("description") || "").toString().trim();
    const location = (formData.get("location") || "").toString().trim();
    const contractType = (formData.get("contractType") || "").toString().trim();
    const workMode = (formData.get("workMode") || "").toString().trim();
    const experienceLevel = (formData.get("experienceLevel") || "").toString().trim();
    const salaryMin = Number(formData.get("salaryMin") || 0);
    const salaryMax = Number(formData.get("salaryMax") || 0);

    if (!title || !description || !location || !contractType || !workMode || !experienceLevel) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    if (description.length < 100) {
      alert("La descripcion debe tener al menos 100 caracteres.");
      return;
    }

    if (Number.isNaN(salaryMin) || Number.isNaN(salaryMax) || salaryMin < 0 || salaryMax < 0) {
      alert("El salario minimo y maximo deben ser numeros validos.");
      return;
    }

    if (salaryMax < salaryMin) {
      alert("El salario maximo no puede ser menor que el salario minimo.");
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Publicando...";
    }

    try {
      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_id: company.id,
          title,
          description,
          location,
          salaryMin,
          salaryMax,
          contractType,
          workMode,
          experienceLevel,
        }),
      });

      if (!response.ok) {
        let message = "No se pudo publicar la oferta.";
        try {
          const errorPayload = await response.json();
          if (Array.isArray(errorPayload?.errors) && errorPayload.errors.length > 0) {
            message = errorPayload.errors.map((item) => item.msg).join("\n");
          } else if (errorPayload?.message) {
            message = errorPayload.message;
          }
        } catch (error) {
          message = "Error al publicar la oferta.";
        }
        alert(message);
        return;
      }

      alert("Oferta publicada correctamente.");
      form.reset();
      window.location.href = "./vacante.html";
    } catch (error) {
      console.error("Error publicando oferta:", error);
      alert("No se pudo conectar con la API para publicar la oferta.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Publicar oferta";
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", initPublicarOfertaPage);
