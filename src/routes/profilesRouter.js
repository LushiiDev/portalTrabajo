import { Router } from 'express';

import * as profilesController from '../controllers/profilesController.js';

const router = Router();

router.get('/', profilesController.getObtenerTodosLosPerfiles);

router.get('/:id', profilesController.getObtenerPerfilPorId);

router.post('/', profilesController.postCrearPerfil);

router.post('/:id/cv-upload', profilesController.postSubirCv);

router.put('/:id', profilesController.putActualizarPerfil);

router.delete('/:id', profilesController.deleteEliminarPerfil);

export default router;