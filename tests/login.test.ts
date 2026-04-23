import type { Express } from 'express';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';

jest.mock('#models/userModel.js', () => ({
  createUser: jest.fn(),
  findUserByEmail: jest.fn(),
}));
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));
jest.mock('#config/dbConnector.js', () => ({ default: {} }));
jest.mock('#config/gcsClient.js', () => {
  const mockFile = {
    delete: jest.fn(() => Promise.resolve()),
    exists: jest.fn(() => Promise.resolve([true])),
    save: jest.fn(() => Promise.resolve()),
  };
  return {
    __esModule: true,
    bucket: { file: jest.fn(() => mockFile) },
  };
});

import { createApp } from '#app.js';
import { findUserByEmail, User } from '#models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const mockFindUserByEmail = findUserByEmail as jest.MockedFunction<typeof findUserByEmail>;
const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;
const mockJwtSign = jwt.sign as jest.MockedFunction<typeof jwt.sign>;

const mockUser = {
  created_at: new Date(),
  email: 'test@test.com',
  id: 1,
  name: 'Test User',
  password_hash: '$2a$10$hashedpassword',
  updated_at: new Date(),
};

describe('POST /api/auth/login', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    app = createApp();
  });

  it('check email is missing and return 400 status', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'password' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'email and password are required' });
  });

  it('check password is missing and return 400 status', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'email and password are required' });
  });

  it('check for body is empty and return 400 status', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'email and password are required' });
  });

  it('check user not found and returns 401 status', async () => {
    mockFindUserByEmail.mockResolvedValueOnce(null);
    const res = await request(app).post('/api/auth/login').send({ email: 'test@testing.com', password: 'password' });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ message: 'Invalid credentials' });
  });

  it('check password is incorrect and return 401 status', async () => {
    mockFindUserByEmail.mockResolvedValueOnce(mockUser);
    mockBcryptCompare.mockResolvedValueOnce(false as never);
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ message: 'Invalid credentials' });
  });

  it('on success login sets access_token cookie and return 200 status', async () => {
    mockFindUserByEmail.mockResolvedValueOnce(mockUser);
    mockBcryptCompare.mockResolvedValueOnce(true as never);
    mockJwtSign.mockReturnValueOnce('signed-token' as never);
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'correct' });
    expect(res.status).toBe(200);
    expect((res.body as { success: boolean; user: User }).user).toMatchObject({
      email: mockUser.email,
      id: mockUser.id,
      name: mockUser.name,
    });
    const cookies: string[] = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
  });

  it('signs jwt with correct payload on success', async () => {
    mockFindUserByEmail.mockResolvedValueOnce(mockUser);
    mockBcryptCompare.mockResolvedValueOnce(true as never);
    mockJwtSign.mockReturnValueOnce('signed-token' as never);
    await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'correct' });
    expect(mockJwtSign).toHaveBeenCalledWith({ email: mockUser.email, id: mockUser.id }, 'test-secret', expect.objectContaining({ expiresIn: '7d' }));
  });
});
