import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import * as adminModerationController from "../controllers/adminModerationController.js";

const router = Router();

router.get("/", requireAdmin, adminModerationController.getModeration);
router.patch(
  "/:table/:id/status",
  requireAdmin,
  adminModerationController.patchStatus,
);
router.delete("/:table/:id", requireAdmin, adminModerationController.deleteRow);

export default router;
