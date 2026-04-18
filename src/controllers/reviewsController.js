import * as reviewsService from "../services/reviewsService.js";

export const getObtenerTodasLasReviews = async (req, res, next) => {
  try {
    const { company_id, status } = req.query;
    const result = await reviewsService.getAllReviews({ companyId: company_id, status });
    res.json(result);
  } catch (err) {
    return next(err);
  }
};

export const postPublicarReview = async (req, res, next) => {
  try {
    const { company_id, user_id, rating, comment, status = "activa" } = req.body;

    if (!company_id || !user_id || !rating || !comment) {
      return res.status(400).json({ message: "Faltan datos obligatorios para publicar la review." });
    }

    const newReview = await reviewsService.postPublicReview(
      company_id,
      user_id,
      rating,
      comment,
      status,
    );
    res.json(newReview);
  } catch (err) {
    return next(err);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await reviewsService.deleteReview(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const putActualizarReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await reviewsService.updateReview(id, updates);
    res.json(result);
  } catch (err) {
    return next(err);
  }
};
