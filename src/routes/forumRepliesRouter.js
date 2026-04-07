import { Router } from "express";

import * as forumRepliesController from '../controllers/forumRepliesController.js';

const router = Router();

router.get('/', forumRepliesController.getAllReplies);
router.post('/', forumRepliesController.postforumReplies);
router.put('/:id', forumRepliesController.putforumReplies);
router.delete('/:id', forumRepliesController.deleteReply);


export default router;