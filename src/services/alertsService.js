import { supabase } from "../config/supabase.js";

export const getAllAlerts = async () => {
  const { data, error } = await supabase.from("alerts").select("*");
  if (error) {
    throw error;
  }
  return data;
};

export const postPublicAlert = async (
  userId,
  keyword,
  location,
  notifyWeb = true,
  notifyEmail = false,
) => {
  const payload = {
    user_id: userId,
    keyword,
    location,
    notify_web: Boolean(notifyWeb),
    notify_email: Boolean(notifyEmail),
  };

  const { data, error } = await supabase
    .from("alerts")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAlert = async (id) => {
  const { data, error } = await supabase
    .from("alerts")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAlert = async (id, updates) => {
  const { data, error } = await supabase
    .from("alerts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
};
