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
    res.json(result);
  } catch (err) {
    return next(err);
  }
};

export const postCrearPerfil = async (req, res, next) => {
  try {

    const {
      full_name, headline, bio, location,
      avatar_url, cv_url, role
    } = req.body;

    const newProfile = await profilesService.createProfile(
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
    res.status(200).json(updatedProfile);
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