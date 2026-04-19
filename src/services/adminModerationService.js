import { supabaseAdmin } from "../config/supabaseAdmin.js";

export const getModerationData = async () => {
  const [threadsRes, reviewsRes] = await Promise.all([
    supabaseAdmin.from("forum_threads").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("reviews").select("*").order("created_at", { ascending: false }),
  ]);

  if (threadsRes.error) throw threadsRes.error;
  if (reviewsRes.error) throw reviewsRes.error;

  return {
    threads: threadsRes.data || [],
    reviews: reviewsRes.data || [],
  };
};

export const setRowStatus = async (table, id, status) => {
  if (!["forum_threads", "reviews"].includes(table)) {
    const err = new Error("Tabla inválida para moderación.");
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabaseAdmin.from(table).update({ status }).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteRow = async (table, id) => {
  if (!["forum_threads", "reviews"].includes(table)) {
    const err = new Error("Tabla inválida para moderación.");
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabaseAdmin.from(table).delete().eq("id", id).select().single();
  if (error) throw error;
  return data;
};

