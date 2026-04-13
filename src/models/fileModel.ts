import type { QueryResult } from 'pg';

import pool from '#config/dbConnector.js';

export interface CreateFileInput {
  mime_type: string;
  name: string;
  project_id: number;
  size: number;
  storage_path: string;
}

export interface ProjectFile {
  created_at: Date;
  id: number;
  mime_type: string;
  name: string;
  project_id: number;
  size: number;
  storage_path: string;
}

export async function createFile(input: CreateFileInput): Promise<ProjectFile> {
  const { mime_type, name, project_id, size, storage_path } = input;
  const result: QueryResult<ProjectFile> = await pool.query(
    `INSERT INTO files (name, project_id, storage_path, mime_type, size)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, project_id, storage_path, mime_type, size]
  );
  await pool.query('UPDATE projects SET files_count = files_count + 1 WHERE id = $1', [project_id]);
  return result.rows[0];
}

export async function deleteFile(id: number): Promise<null | ProjectFile> {
  const result: QueryResult<ProjectFile> = await pool.query('DELETE FROM files WHERE id = $1 RETURNING *', [id]);
  if ((result.rowCount ?? 0) === 0) return null;
  const deleted = result.rows[0];
  await pool.query('UPDATE projects SET files_count = files_count - 1 WHERE id = $1', [deleted.project_id]);
  return deleted;
}

export async function findFileById(id: number): Promise<null | ProjectFile> {
  const result: QueryResult<ProjectFile> = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function getFilesByProject(project_id: number): Promise<ProjectFile[]> {
  const result: QueryResult<ProjectFile> = await pool.query('SELECT * FROM files WHERE project_id = $1 ORDER BY created_at DESC', [project_id]);
  return result.rows;
}
