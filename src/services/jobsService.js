import { supabase } from "../config/supabase.js";

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

export const postPublicJob = async (
  title,
  description,
  location,
  salaryMin,
  salaryMax,
  contractType,
  experienceLevel,
) => {
  const payload = {
    title,
    description,
    location,
    salary_min: salaryMin,
    salary_max: salaryMax,
    contract_type: contractType,
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
  const { data, error } = await supabase
    .from("job_posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
};
