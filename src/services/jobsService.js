import { supabase } from "../config/supabase.js";

function normalizeJobStatus(status) {
  const v = String(status || "").trim().toLowerCase();
  if (v === "active" || v === "activa" || v === "activo") return "activo";
  if (
    v === "closed" ||
    v === "cerrada" ||
    v === "cerrado" ||
    v === "inactiva" ||
    v === "inactivo"
  ) return "inactivo";
  if (v === "pending" || v === "pendiente") return "pendiente";
  if (v === "rejected" || v === "rechazada" || v === "rechazado") return "rechazada";
  return v || "pendiente";
}

export const getAllJobs = async () => {
  const { data, error } = await supabase.from("job_posts").select("*");
  if (error) {
    throw error;
  }
  return data;
};

export const getJobByTitle = async (nombre) => {
  const buscar = `%${nombre}%`;
  const { data, error } = await supabase
    .from("job_posts")
    .select("*")
    .ilike("title", buscar);
  if (error) {
    throw error;
  }
  return data;
};

export const getJobById = async (id) => {
  const { data, error } = await supabase
    .from("job_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const postPublicJob = async (
  company_id,
  title,
  description,
  location,
  salaryMin,
  salaryMax,
  contractType,
  workMode,
  experienceLevel,
) => {
  const payload = {
    company_id,
    title,
    description,
    location,
    salary_min: salaryMin,
    salary_max: salaryMax,
    contract_type: contractType,
    work_mode: workMode,
    experience_level: experienceLevel,
  };

  const { data, error } = await supabase
    .from("job_posts")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteJob = async (id) => {
  const { data, error } = await supabase
    .from("job_posts")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Trabajo no encontrado");
    }
    throw error;
  }

  return {
    message: "Trabajo eliminado correctamente",
    job: data,
  };
};

export const updateJob = async (id, updates) => {
  const payload = { ...updates };
  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    payload.status = normalizeJobStatus(payload.status);
  }

  const { data, error } = await supabase
    .from("job_posts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
};
