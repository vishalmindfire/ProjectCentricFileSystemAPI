import type { NextFunction, Request, Response } from 'express';

import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'access_token';

export function checkAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies[COOKIE_NAME] as string | undefined;

  if (!token) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (!isAuthPayload(payload)) {
      res.status(401).json({ message: 'Invalid token payload' });
      return;
    }
    req.user = { email: payload.email, id: payload.id };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing environment variable: JWT_SECRET');
  return secret;
}

function isAuthPayload(payload: jwt.JwtPayload | string): payload is { email: string; id: number } {
  return typeof payload !== 'string' && Object.hasOwn(payload, 'id') && Object.hasOwn(payload, 'email');
}
