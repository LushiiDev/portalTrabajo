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
    const {
      job_post_id,
      candidate_id,
      cv_url,
      status,
      job_id,
      user_id,
    } = req.body;

    const normalizedJobPostId = job_post_id || job_id;
    const normalizedCandidateId = candidate_id || user_id;

    if (!normalizedJobPostId || !normalizedCandidateId) {
      return res.status(400).json({
        message: "job_post_id y candidate_id son requeridos.",
      });
    }

    const newApplication = await applicationsService.postPublicApplication(
      normalizedJobPostId,
      normalizedCandidateId,
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
