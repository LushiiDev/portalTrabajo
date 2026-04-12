import * as jobsService from "../services/jobsService.js";

export const getObtenerTodosLosTrabajos = async (req, res, next) => {
  try {
    const resultTrabajos = await jobsService.getAllJobs();
    res.json(resultTrabajos);
  } catch (err) {
    return next(err);
  }
};

export const getObtenerTrabajoPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await jobsService.getJobById(id);
    res.json(job);
  } catch (err) {
    next(err);
  }
};

export const postPublicarTrabajo = async (req, res, next) => {
  try {
    const {
      company_id,
      title,
      description,
      location,
      salaryMin,
      salaryMax,
      contractType,
      workMode,
      experienceLevel,
    } = req.body;

    const newJob = await jobsService.postPublicJob(
      company_id,
      title,
      description,
      location,
      salaryMin,
      salaryMax,
      contractType,
      workMode,
      experienceLevel,
    );
    res.json(newJob);
  } catch (err) {
    return next(err);
  }
};

export const deleteTrabajo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteJob(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const putActualizarTrabajo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await jobsService.updateJob(id, updates);
    res.json(result);
  } catch (err) {
    return next(err);
  }
};
