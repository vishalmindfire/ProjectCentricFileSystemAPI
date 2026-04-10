import type { QueryResult } from 'pg';

import pool from '#config/dbConnector.js';

export interface CreateProjectInput {
  description: string;
  name: string;
}

export interface Project {
  created_at: Date;
  description: string;
  files_count: number;
  id: number;
  jobs_count: number;
  name: string;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { description, name } = input;
  const result: QueryResult<Project> = await pool.query(
    `INSERT INTO project (name, description, files_count, jobs_count, created_at)
     VALUES ($1, $2, 0, 0, $3)
     RETURNING *`,
    [name, description, new Date()]
  );
  return result.rows[0];
}

export async function deleteProject(id: number): Promise<boolean> {
  const result: QueryResult<Project> = await pool.query('DELETE FROM project WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getProjectById(id: number): Promise<null | Project> {
  const result: QueryResult<Project> = await pool.query('SELECT * FROM project WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function getProjects(): Promise<Project[]> {
  const result: QueryResult<Project> = await pool.query('SELECT * FROM project ORDER BY created_at DESC');
  return result.rows;
}
