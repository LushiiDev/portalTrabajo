import { supabase } from "../config/supabase.js";

export const getAllReviews = async () => {
  const { data, error } = await supabase.from("reviews").select("*");
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
    status,
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
  const { data, error } = await supabase
    .from("reviews")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
};
