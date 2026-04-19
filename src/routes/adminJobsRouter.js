import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import * as adminJobsController from "../controllers/adminJobsController.js";

const router = Router();

router.get("/", requireAdmin, adminJobsController.getJobs);
router.patch("/:id/status", requireAdmin, adminJobsController.patchJobStatus);
router.delete("/:id", requireAdmin, adminJobsController.deleteJob);

export default router;

