import type { Request, Response } from 'express';

import { login, logout, register } from '#config/controllers/authController.js';
import { checkAuth } from '#middleware/auth.js';
import { Router } from 'express';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/register', register);
router.post('/checkAuth', checkAuth, (req: Request, res: Response) => {
  res.json(req.user);
});

export default router;
