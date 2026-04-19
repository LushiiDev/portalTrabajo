import { supabase } from "../config/supabase.js";

function normalizeReplyStatus(status) {
  const value = String(status || "activo").trim().toLowerCase();
  if (value.includes("inact") || value.includes("elim") || value.includes("close")) return "inactivo";
  return "activo";
}

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
    status: normalizeReplyStatus(status),
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
  const payload = { ...replyData };
  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    payload.status = normalizeReplyStatus(payload.status);
  }

  const { data, error } = await supabase
    .from("forum_replies")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data;
};

