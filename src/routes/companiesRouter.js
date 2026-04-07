import { Router } from 'express';

import * as companiesController from '../controllers/companiesController.js';

const router = Router();

router.get('/', companiesController.getObtenerTodasLasEmpresas);

router.get('/:id', companiesController.getObtenerEmpresaPorId);

router.post('/', companiesController.postCrearEmpresa);

router.put('/:id', companiesController.putActualizarEmpresa);

router.delete('/:id', companiesController.deleteEliminarEmpresa);

export default router;