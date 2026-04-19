import * as adminJobsService from "../services/adminJobsService.js";

export const getJobs = async (req, res, next) => {
  try {
    const jobs = await adminJobsService.getAllJobs();
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
};

export const patchJobStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ status: "error", message: "Falta 'status'." });
    const job = await adminJobsService.setJobStatus(id, status);
    res.json(job);
  } catch (err) {
    next(err);
  }
};

export const deleteJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await adminJobsService.deleteJob(id);
    res.json(deleted);
  } catch (err) {
    next(err);
  }
};

