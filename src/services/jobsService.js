import { supabase } from "../config/supabase.js";

export const getAllJobs = async () => {
  const { data, error } = await supabase.from("job_posts").select("*");
  if (error) {
    throw error;
  }
  return data;
};
