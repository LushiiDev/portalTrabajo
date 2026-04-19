import { supabase } from "../config/supabase.js";

function normalizeThreadStatus(status) {
  const value = String(status || "activo").trim().toLowerCase();
  if (value.includes("inact") || value.includes("elim") || value.includes("close")) return "inactivo";
  return "activo";
}

export const getAllThreads = async () => {
  const { data, error } = await supabase.from("forum_threads").select("*");
  if (error) {
    throw error;
  }
  return data;
};

export const postforumThreads = async (
  user_id,
  title,
  content,
  category,
  status
) => {
  const payload = {
    user_id,
    title,
    content,
    category,
    status: normalizeThreadStatus(status),
  };
  const { data, error } = await supabase
    .from("forum_threads")
    .insert([payload])
    .select()
    .single();
    if (error) throw error;
    return data;
}


export const deleteforumThreads = async (id) => {
  const { data, error } = await supabase
    .from("forum_threads")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("No se encontró el thread con el id proporcionado");
    }
    throw error;
  }
  return {
    message: "Thread eliminado exitosamente",
    reply: data,
  };
};

export const updateThread = async (id, threadData) => {
  const payload = { ...threadData };
  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    payload.status = normalizeThreadStatus(payload.status);
  }

  const { data, error } = await supabase
    .from("forum_threads")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data;
};