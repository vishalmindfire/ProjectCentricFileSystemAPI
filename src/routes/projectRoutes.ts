import { create, getAll, getById, remove } from '#config/controllers/projectController.js';
import { checkAuth } from '#middleware/auth.js';
import { Router } from 'express';

const router = Router();

router.get('/', checkAuth, getAll);
router.get('/:id', checkAuth, getById);
router.post('/', checkAuth, create);
router.delete('/:id', checkAuth, remove);

export default router;
