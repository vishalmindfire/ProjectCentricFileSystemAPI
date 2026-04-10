import type { QueryResult } from 'pg';

import pool from '#config/dbConnector.js';

export interface CreateUserInput {
  email: string;
  name: string;
  password_hash: string;
  role?: string;
}

export interface User {
  created_at: Date;
  email: string;
  id: number;
  name: string;
  password_hash: string;
  role?: string;
  updated_at: Date;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { email, name, password_hash, role } = input;
  const result: QueryResult<User> = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, email, password_hash, role ?? 'USER', new Date()]
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<null | User> {
  const result: QueryResult<User> = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ?? null;
}
