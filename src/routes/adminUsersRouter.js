import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import * as adminUsersController from "../controllers/adminUsersController.js";

const router = Router();

router.get("/", requireAdmin, adminUsersController.getUsers);
router.patch("/:table/:id/status", requireAdmin, adminUsersController.patchUserStatus);
router.delete("/:table/:id", requireAdmin, adminUsersController.deleteUser);

export default router;

