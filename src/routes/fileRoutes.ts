import { getByProject, remove, upload } from '#config/controllers/fileController.js';
import { checkAuth } from '#middleware/auth.js';
import uploadMiddleware from '#middleware/upload.js';
import { Router } from 'express';

const router = Router({ mergeParams: true });

router.get('/', checkAuth, getByProject);
router.post('/', checkAuth, uploadMiddleware.array('files'), upload);
router.delete('/:id', checkAuth, remove);

export default router;
