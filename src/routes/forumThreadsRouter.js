import { Router } from "express";

import * as forumThreadsController from '../controllers/forumThreadsController.js';

const router = Router();

router.get('/', forumThreadsController.getAllThreads);
router.post('/', forumThreadsController.postforumThreads);
router.put('/:id', forumThreadsController.putforumThreads);
router.delete('/:id', forumThreadsController.deleteThread);


export default router;