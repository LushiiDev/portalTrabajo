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

  if (error && error.code === 'PGRST116') {
    return null;
  }

  if (error) throw error;
  return data;
};

export const createProfile = async (
  id,
  full_name, headline, bio, location,
  avatar_url, cv_url, role, skills
) => {
  const profileId = id || crypto.randomUUID();

  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      id: profileId,
      full_name, headline, bio, location,
      avatar_url, cv_url, role, skills
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateProfile = async (
  id, full_name, headline, bio, location,
  avatar_url, cv_url, role, skills
) => {
  const { data: existing, error: findError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (findError && findError.code === 'PGRST116') return null;
  if (findError) throw findError;
  if (!existing) return null;

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name, headline, bio, location,
      avatar_url, cv_url, role, skills
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

function ensureValidCvPayload(fileName, fileType, fileDataBase64) {
  if (!fileName || !fileType || !fileDataBase64) {
    const error = new Error('Debes enviar fileName, fileType y fileDataBase64');
    error.statusCode = 400;
    throw error;
  }

  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedMimeTypes.includes(fileType)) {
    const error = new Error('Tipo de archivo no permitido');
    error.statusCode = 400;
    throw error;
  }
}

function ensureValidAvatarPayload(fileName, fileType, fileDataBase64) {
  if (!fileName || !fileType || !fileDataBase64) {
    const error = new Error('Debes enviar fileName, fileType y fileDataBase64');
    error.statusCode = 400;
    throw error;
  }

  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  if (!allowedMimeTypes.includes(fileType)) {
    const error = new Error('Tipo de imagen no permitido');
    error.statusCode = 400;
    throw error;
  }
}

function sanitizeFileName(fileName) {
  return String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
}

export const uploadCvForProfile = async (profileId, fileName, fileType, fileDataBase64) => {
  ensureValidCvPayload(fileName, fileType, fileDataBase64);

  const bucketCandidates = Array.from(
    new Set([
      process.env.CV_BUCKET_NAME,
      'cvs',
      'CVS',
      'cv',
      'resumes',
    ].filter(Boolean))
  );
  const cleanFileName = sanitizeFileName(fileName);
  const objectPath = `${profileId}/${Date.now()}-${cleanFileName}`;
  const fileBuffer = Buffer.from(fileDataBase64, 'base64');

  let bucketNameUsed = null;
  let lastUploadError = null;

  for (const bucketName of bucketCandidates) {
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(objectPath, fileBuffer, {
        contentType: fileType,
        upsert: true,
      });

    if (uploadError) {
      lastUploadError = uploadError;
      const message = String(uploadError.message || '').toLowerCase();
      if (message.includes('bucket not found')) {
        continue;
      }

      throw uploadError;
    }

    bucketNameUsed = bucketName;
    break;
  }

  if (!bucketNameUsed) {
    throw lastUploadError || new Error('No se encontro un bucket valido para CV');
  }

  const { data: publicData } = supabase.storage.from(bucketNameUsed).getPublicUrl(objectPath);
  const cvUrl = publicData?.publicUrl || null;

  if (!cvUrl) {
    const error = new Error('No se pudo generar URL publica del CV');
    error.statusCode = 500;
    throw error;
  }

  const { data: updatedProfile, error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: profileId, cv_url: cvUrl }, { onConflict: 'id' })
    .select('*')
    .single();

  if (profileError) throw profileError;

  return {
    cvUrl,
    profile: updatedProfile,
  };
};

export const uploadAvatarForProfile = async (profileId, fileName, fileType, fileDataBase64) => {
  ensureValidAvatarPayload(fileName, fileType, fileDataBase64);

  const bucketName = process.env.AVATAR_BUCKET_NAME || 'avatars';
  const cleanFileName = sanitizeFileName(fileName);
  const objectPath = `${profileId}/${Date.now()}-${cleanFileName}`;
  const fileBuffer = Buffer.from(fileDataBase64, 'base64');

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(objectPath, fileBuffer, {
      contentType: fileType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
  const avatarUrl = publicData?.publicUrl || null;

  if (!avatarUrl) {
    const error = new Error('No se pudo generar URL publica del avatar');
    error.statusCode = 500;
    throw error;
  }

  const { data: updatedProfile, error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: profileId, avatar_url: avatarUrl }, { onConflict: 'id' })
    .select('*')
    .single();

  if (profileError) throw profileError;

  return {
    avatarUrl,
    profile: updatedProfile,
  };
};