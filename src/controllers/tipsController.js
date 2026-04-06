import * as tipsService from '../services/tipsService.js';

export const getAllTips = async (req, res, next) => {
  try {
    const tips = await tipsService.getAllTips();
    res.json(tips);
  } catch (err) {
    return next(err);
  }
};

export const postTip = async (req, res, next) => {
  try {
    const { title, description, category } = req.body;
    const newTip = await tipsService.postTip(title, description, category);
    res.json(newTip);
  } catch (err) {
    return next(err);
  }
};

export const putTip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedTip = await tipsService.updateTip(id, updates);
    res.json(updatedTip);
  } catch (err) {
    return next(err);
  }
};

export const deleteTip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await tipsService.deleteTip(id);
    res.json(result);
  } catch (err) {
    return next(err);
  }
};
