import { Router } from "express";

import * as jobsController from '../controllers/jobsController.js';
import { createJobValidator, runValidations } from "../middlewares/validator.js";

const router = Router();

router.get('/', jobsController.getObtenerTodosLosTrabajos);

router.get('/:id', jobsController.getObtenerTrabajoPorId);

router.post('/', runValidations(createJobValidator),jobsController.postPublicarTrabajo);

router.delete("/:id", jobsController.deleteTrabajo);

router.put('/:id', jobsController.putActualizarTrabajo);
export default router;