import { supabase } from "../config/supabase.js";

export const getAllReplies = async () => {
  const { data, error } = await supabase.from("forum_replies").select("*");
  if (error) {
    throw error;
  }
  return data;
};

export const postforumReplies = async (
  thread_id,
  user_id,
  content,
  status
) => {
  const payload = {
    thread_id,
    user_id,
    content,
    status,
  };
  const { data, error } = await supabase
    .from("forum_replies")
    .insert([payload])
    .select()
    .single();
    if (error) throw error;
    return data;
}


export const deleteforumReplies = async (id) => {
  const { data, error } = await supabase
    .from("forum_replies")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("No se encontró el reply con el id proporcionado");
    }
    throw error;
  }
  return {
    message: "Reply eliminado exitosamente",
    reply: data,
  };
};

export const updateReply = async (id, replyData) => {
  const { data, error } = await supabase
    .from("forum_replies")
    .update(replyData)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data;
};

