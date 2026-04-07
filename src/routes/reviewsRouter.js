import { Router } from "express";

import * as reviewsController from "../controllers/reviewsController.js";

const router = Router();

router.get("/", reviewsController.getObtenerTodasLasReviews);

router.post("/", reviewsController.postPublicarReview);

router.delete("/:id", reviewsController.deleteReview);

router.put("/:id", reviewsController.putActualizarReview);

export default router;
