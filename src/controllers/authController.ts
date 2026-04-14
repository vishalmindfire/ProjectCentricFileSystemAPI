import type { Request, Response } from 'express';

import { createUser, type CreateUserInput } from '#models/userModel.js';
import { findUserByEmail } from '#models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ message: 'email and password are required' });
    return;
  }

  const user = await findUserByEmail(email);
  console.log(user);
  if (!user) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ email: user.email, id: user.id }, getJwtSecret(), {
    expiresIn: '7d',
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'none',
    secure: true,
  });

  res.json({ email: user.email, id: user.id, name: user.name });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME);
  res.json({ message: 'Logged out successfully' });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, name, password } = req.body as CreateUserInput & { password: string };

  if (!email || !name || !password) {
    res.status(400).json({ message: 'email, name, and password are required' });
    return;
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    res.status(409).json({ message: 'User with this email already exists' });
    return;
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({ email, name, password_hash });

  res.status(201).json({ email: user.email, id: user.id, name: user.name });
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing environment variable: JWT_SECRET');
  return secret;
}
