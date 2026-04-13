import type { Request, Response } from 'express';

import { createFile, deleteFile, findFileById, getFilesByProject } from '#models/fileModel.js';
import fs from 'fs/promises';

export async function getByProject(req: Request, res: Response): Promise<void> {
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ message: 'Invalid project id' });
    return;
  }
  const files = await getFilesByProject(projectId);
  res.json(files);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const projectId = Number(req.params.projectId);
  const id = Number(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ message: 'Invalid project id' });
    return;
  }
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid file id' });
    return;
  }

  const file = await findFileById(id);
  if (!file) {
    res.status(404).json({ message: 'File not found' });
    return;
  }
  if (file.project_id !== projectId) {
    res.status(404).json({ message: 'File is not accessible' });
    return;
  }

  await fs.unlink(file.storage_path);
  await deleteFile(id);
  res.status(204).send();
}

export async function upload(req: Request, res: Response): Promise<void> {
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ message: 'Invalid project id' });
    return;
  }

  const files = req.files as Express.MulterFile[] | undefined;

  if (!files || files.length === 0) {
    res.status(400).json({ message: 'No files provided' });
    return;
  }

  const created = await Promise.all(
    files.map((f) =>
      createFile({
        mime_type: f.mimetype,
        name: f.originalname,
        project_id: projectId,
        size: f.size,
        storage_path: f.path,
      })
    )
  );

  res.status(201).json(created);
}
