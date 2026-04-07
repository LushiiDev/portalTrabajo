import { Router } from "express";

import * as applicationsController from "../controllers/applicationsController.js"

const router = Router();

router.get('/', applicationsController.getObtenerTodasLasAplicaciones);

router.post('/', applicationsController.postPublicarAplicacion);

router.delete('/:id', applicationsController.deleteAplicacion);

router.put('/:id', applicationsController.putActualizarAplicacion);
export default router;