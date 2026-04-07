import * as alertsService from "../services/alertsService.js";

export const getObtenerTodasLasAlertas = async (req, res, next) => {
  try {
    const result = await alertsService.getAllAlerts();
    res.json(result);
  } catch (err) {
    return next(err);
  }
};

export const postPublicarAlerta = async (req, res, next) => {
  try {
    const { user_id, keyword, location } = req.body;

    const newAlert = await alertsService.postPublicAlert(
      user_id,
      keyword,
      location,
    );
    res.json(newAlert);
  } catch (err) {
    return next(err);
  }
};

export const deleteAlerta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await alertsService.deleteAlert(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const putActualizarAlerta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await alertsService.updateAlert(id, updates);
    res.json(result);
  } catch (err) {
    return next(err);
  }
};
