import { supabaseAdmin } from "../config/supabaseAdmin.js";

const ALLOWED_TABLES = ["forum_threads", "forum_replies", "reviews", "tips"];

function normalizeModerationStatus(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("inact") || v.includes("elim") || v.includes("close") || v.includes("off")) {
    return "inactivo";
  }
  if (v.includes("act") || v.includes("open") || v.includes("publ") || v.includes("ok")) {
    return "activo";
  }
  return v || "activo";
}

export const getModerationData = async () => {
  const [threadsRes, repliesRes, reviewsRes, tipsRes] = await Promise.all([
    supabaseAdmin.from("forum_threads").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("forum_replies").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("reviews").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("tips").select("*").order("created_at", { ascending: false }),
  ]);

  if (threadsRes.error) throw threadsRes.error;
  if (repliesRes.error) throw repliesRes.error;
  if (reviewsRes.error) throw reviewsRes.error;
  if (tipsRes.error) throw tipsRes.error;

  return {
    threads: threadsRes.data || [],
    replies: repliesRes.data || [],
    reviews: reviewsRes.data || [],
    tips: tipsRes.data || [],
  };
};

export const setRowStatus = async (table, id, status) => {
  if (!ALLOWED_TABLES.includes(table)) {
    const err = new Error("Tabla inválida para moderación.");
    err.statusCode = 400;
    throw err;
  }

  const normalized = normalizeModerationStatus(status);
  if (!["activo", "inactivo"].includes(normalized)) {
    const err = new Error("Estado inválido para moderación. Usa activo o inactivo.");
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabaseAdmin
    .from(table)
    .update({ status: normalized })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteRow = async (table, id) => {
  if (!ALLOWED_TABLES.includes(table)) {
    const err = new Error("Tabla inválida para moderación.");
    err.statusCode = 400;
    throw err;
  }

  return setRowStatus(table, id, "inactivo");
};

