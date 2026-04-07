import { supabase } from "../config/supabase.js";

export const getAllTips = async () => {
  const { data, error } = await supabase.from("tips").select("*");
  if (error) {
    throw error;
  }
  return data;
};

export const postTip = async (title, description, category) => {
  const payload = {
    title,
    description,
    category,
  };

  const { data, error } = await supabase
    .from("tips")
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const deleteTip = async (id) => {
  const { data, error } = await supabase
    .from("tips")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("No se encontró el tip con el id proporcionado");
    }
    throw error;
  }

  return {
    message: "Tip eliminado exitosamente",
    tip: data,
  };
};

export const updateTip = async (id, tipData) => {
  const { data, error } = await supabase
    .from("tips")
    .update(tipData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};
