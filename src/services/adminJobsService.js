import { supabaseAdmin } from "../config/supabaseAdmin.js";

export const getAllJobs = async () => {
  const { data, error } = await supabaseAdmin
    .from("job_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const setJobStatus = async (id, status) => {
  const { data, error } = await supabaseAdmin
    .from("job_posts")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteJob = async (id) => {
  const { data, error } = await supabaseAdmin.from("job_posts").delete().eq("id", id).select().single();
  if (error) throw error;
  return data;
};

