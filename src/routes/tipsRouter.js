import { Router } from 'express';
import * as tipsController from '../controllers/tipsController.js';

const router = Router();

router.get('/', tipsController.getAllTips);
router.post('/', tipsController.postTip);
router.put('/:id', tipsController.putTip);
router.delete('/:id', tipsController.deleteTip);

export default router;
