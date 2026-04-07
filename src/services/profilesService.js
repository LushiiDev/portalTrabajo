import { supabase } from '../config/supabase.js';

export const getAllProfiles = async () => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data;
};

export const getProfileById = async (id) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error('Perfil no encontrado');
  return data;
};

export const createProfile = async (
  full_name, headline, bio, location,
  avatar_url, cv_url, role
) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      id: crypto.randomUUID(), 
      full_name, headline, bio, location,
      avatar_url, cv_url, role
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateProfile = async (
  id, full_name, headline, bio, location,
  avatar_url, cv_url, role
) => {

  const { data: existing, error: findError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (findError || !existing) throw new Error('Perfil no encontrado');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name, headline, bio, location,
      avatar_url, cv_url, role
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteProfile = async (id) => {
  const { data: existing, error: findError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (findError || !existing) throw new Error('Perfil no encontrado');

  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;

  return { message: 'Perfil eliminado correctamente', profile: existing };
};