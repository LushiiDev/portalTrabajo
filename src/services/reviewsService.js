import { supabase } from "../config/supabase.js";

function normalizeReviewStatus(status) {
  const value = String(status || "activa").trim().toLowerCase();
  return value || "activa";
}

export const getAllReviews = async ({ companyId = null, status = null } = {}) => {
  let query = supabase.from("reviews").select("*").order("created_at", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  if (status) {
    query = query.eq("status", normalizeReviewStatus(status));
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data;
};

export const postPublicReview = async (
  companyId,
  userId,
  rating,
  comment,
  status,
) => {
  const payload = {
    company_id: companyId,
    user_id: userId,
    rating,
    comment,
    status: normalizeReviewStatus(status),
  };

  const { data, error } = await supabase
    .from("reviews")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteReview = async (id) => {
  const { data, error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateReview = async (id, updates) => {
  const payload = { ...updates };

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    payload.status = normalizeReviewStatus(payload.status);
  }

  const { data, error } = await supabase
    .from("reviews")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
};
