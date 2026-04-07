import { supabase } from "../config/supabase.js";

export const getAllApplications = async () => {
  const { data, error } = await supabase.from("applications").select("*");
  if (error) {
    throw error;
  }
  return data;
};

export const postPublicApplication = async (cv_url, status) => {
  const payload = {
    cv_url,
    status: "pendiente",
  };

  const { data, error } = await supabase
    .from("applications")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteApplication = async (id) => {
  const { data, error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateApplication = async (id, updates) => {
  const { data, error } = await supabase
    .from("applications")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
};
