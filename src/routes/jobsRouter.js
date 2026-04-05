import { Router } from "express";

import * as jobsController from '../controllers/jobsController.js';

const router = Router();

router.get('/', jobsController.getObtenerTodosLosTrabajos);

export default router;