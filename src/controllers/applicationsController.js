import * as applicationsService from "../services/applicationsService.js";

export const getObtenerTodasLasAplicaciones = async (req, res, next) => {
  try {
    const result = await applicationsService.getAllApplications();
    res.json(result);
  } catch (err) {
    return next(err);
  }
};

export const postPublicarAplicacion = async (req, res, next) => {
  try {
    const { cv_url, status } = req.body;

    const newApplication = await applicationsService.postPublicApplication(
      cv_url,
      status,
    );
    res.json(newApplication);
  } catch (err) {
    return next(err);
  }
};

export const deleteAplicacion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await applicationsService.deleteApplication(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const putActualizarAplicacion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await applicationsService.updateApplication(id, updates);
    res.json(result);
  } catch (err) {
    return next(err);
  }
};
