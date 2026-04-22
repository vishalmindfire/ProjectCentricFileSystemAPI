import { create, download, getById, getByProject } from '#config/controllers/jobController.js';
import { checkAuth } from '#middleware/auth.js';
import { Router } from 'express';

const router = Router({ mergeParams: true });

router.get('/', checkAuth, getByProject);
router.post('/', checkAuth, create);
router.get('/:id', checkAuth, getById);
router.get('/:id/download', checkAuth, download);

export default router;
