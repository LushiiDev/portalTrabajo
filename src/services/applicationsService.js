import { supabase } from "../config/supabase.js";

export const getAllApplications = async () => {
  const { data, error } = await supabase.from("applications").select("*");
  if (error) {
    throw error;
  }
  return data;
};

export const postPublicApplication = async (
  jobPostId,
  candidateId,
  cv_url,
  status,
) => {
  const payload = {
    job_post_id: jobPostId,
    candidate_id: candidateId,
    cv_url,
    status: status || "pendiente",
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
