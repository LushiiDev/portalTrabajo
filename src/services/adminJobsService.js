import { supabaseAdmin } from "../config/supabaseAdmin.js";

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
  const { data, error } = await supabaseAdmin
    .from("job_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const setJobStatus = async (id, status) => {
  const normalizedStatus = normalizeJobStatus(status);
  const { data, error } = await supabaseAdmin
    .from("job_posts")
    .update({ status: normalizedStatus })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteJob = async (id) => {
  const { data, error } = await supabaseAdmin.from("job_posts").delete().eq("id", id).select().single();
  if (error) throw error;
  return data;
};

