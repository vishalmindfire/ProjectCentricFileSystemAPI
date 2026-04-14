import type { QueryResult } from 'pg';

import pool from '#config/dbConnector.js';

export interface Job {
  completed_at: Date | null;
  created_at: Date;
  id: number;
  progress: number;
  project_id: number;
  status: JobStatus;
  zip_path: null | string;
}

export type JobStatus = 'COMPLETED' | 'FAILED' | 'PENDING' | 'PROCESSING';

export async function createJob(project_id: number): Promise<Job> {
  const result: QueryResult<Job> = await pool.query(
    `INSERT INTO jobs (project_id, status)
     VALUES ($1, 'PENDING')
     RETURNING *`,
    [project_id]
  );
  await pool.query('UPDATE projects SET jobs_count = jobs_count + 1 WHERE id = $1', [project_id]);
  return result.rows[0];
}

export async function findJobById(id: number): Promise<Job | null> {
  const result: QueryResult<Job> = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function getJobsByProject(project_id: number): Promise<Job[]> {
  const result: QueryResult<Job> = await pool.query('SELECT * FROM jobs WHERE project_id = $1 ORDER BY created_at DESC', [project_id]);
  return result.rows;
}

export async function updateJobProgress(id: number, progress: number): Promise<void> {
  await pool.query('UPDATE jobs SET progress = $1 WHERE id = $2', [progress, id]);
}

export async function updateJobStatus(id: number, status: JobStatus, zip_path?: string): Promise<Job | null> {
  const completed_at = status === 'COMPLETED' || status === 'FAILED' ? new Date() : null;
  const result: QueryResult<Job> = await pool.query(
    `UPDATE jobs
     SET status = $1, completed_at = $2, zip_path = COALESCE($3, zip_path)
     WHERE id = $4
     RETURNING *`,
    [status, completed_at, zip_path ?? null, id]
  );
  return result.rows[0] ?? null;
}
