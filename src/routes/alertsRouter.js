import { Router } from "express";

import * as alertsController from "../controllers/alertsController.js";

const router = Router();

router.get("/", alertsController.getObtenerTodasLasAlertas);

router.post("/", alertsController.postPublicarAlerta);

router.delete("/:id", alertsController.deleteAlerta);

router.put("/:id", alertsController.putActualizarAlerta);

export default router;
