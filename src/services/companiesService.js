import { supabase } from '../config/supabase.js';

export const getAllCompanies = async () => {
  const { data, error } = await supabase.from('companies').select('*');
  if (error) throw error;
  return data;
};

export const getCompanyById = async (id) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error('Empresa no encontrada');
  return data;
};

export const createCompany = async (
  user_id, name, description, logo_url,
  website, sector, size, founded_year,
  location, linkedin_url, facebook_url
) => {
  const { data, error } = await supabase
    .from('companies')
    .insert([{
      user_id, name, description, logo_url,
      website, sector, size, founded_year,
      location, linkedin_url, facebook_url
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCompany = async (
  id, user_id, name, description, logo_url,
  website, sector, size, founded_year,
  location, linkedin_url, facebook_url
) => {
  const { data: existing, error: findError } = await supabase.from('companies').select('*').eq('id', id).single();

  if (findError || !existing) throw new Error('Empresa no encontrada');
  const { data, error } = await supabase.from('companies').update({
      user_id, name, description, logo_url,
      website, sector, size, founded_year,
      location, linkedin_url, facebook_url
    })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteCompany = async (id) => {
  const { data: existing, error: findError } = await supabase.from('companies').select('*').eq('id', id).single();

  if (findError || !existing) throw new Error('Empresa no encontrada');

  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw error;

  return { message: 'Empresa eliminada correctamente', company: existing };
};