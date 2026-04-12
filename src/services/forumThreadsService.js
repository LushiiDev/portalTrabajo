import { supabase } from "../config/supabase.js";

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
    status,
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
  const { data, error } = await supabase
    .from("forum_threads")
    .update(threadData)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data;
};