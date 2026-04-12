import * as profilesService from '../services/profilesService.js';

export const getObtenerTodosLosPerfiles = async (req, res, next) => {
  try {
    const result = await profilesService.getAllProfiles();
    res.json(result);
  } catch (err) {
    return next(err);
  }
};

export const getObtenerPerfilPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await profilesService.getProfileById(id);

    if (!result) {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }

    res.json(result);
  } catch (err) {
    return next(err);
  }
};

export const postCrearPerfil = async (req, res, next) => {
  try {

    const {
      id,
      full_name, headline, bio, location,
      avatar_url, cv_url, role
    } = req.body;

    const newProfile = await profilesService.createProfile(
      id,
      full_name, headline, bio, location,
      avatar_url, cv_url, role
    );

    res.status(201).json(newProfile);
  } catch (err) {
    return next(err);
  }
};

export const putActualizarPerfil = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      full_name, headline, bio, location,
      avatar_url, cv_url, role
    } = req.body;

    const updatedProfile = await profilesService.updateProfile(
      id, full_name, headline, bio, location,
      avatar_url, cv_url, role
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }

    res.status(200).json(updatedProfile);
  } catch (err) {
    return next(err);
  }
};

export const postSubirCv = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fileName, fileType, fileDataBase64 } = req.body;

    const result = await profilesService.uploadCvForProfile(id, fileName, fileType, fileDataBase64);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

export const deleteEliminarPerfil = async (req, res, next) => {
  try {

    const { id } = req.params;

    const result = await profilesService.deleteProfile(id);

    res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};