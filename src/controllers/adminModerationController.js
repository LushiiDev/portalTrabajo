import * as adminModerationService from "../services/adminModerationService.js";

export const getModeration = async (req, res, next) => {
  try {
    const data = await adminModerationService.getModerationData();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const patchStatus = async (req, res, next) => {
  try {
    const { table, id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ status: "error", message: "Falta 'status'." });
    const row = await adminModerationService.setRowStatus(table, id, status);
    res.json(row);
  } catch (err) {
    next(err);
  }
};

export const deleteRow = async (req, res, next) => {
  try {
    const { table, id } = req.params;
    const row = await adminModerationService.deleteRow(table, id);
    res.json(row);
  } catch (err) {
    next(err);
  }
};

