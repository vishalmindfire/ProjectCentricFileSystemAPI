import type { Request, Response } from 'express';

import { bucket } from '#config/gcsClient.js';
import { createFile, deleteFile, findFileById, getFilesByProject } from '#models/fileModel.js';
import { v4 as uuidv4 } from 'uuid';

export interface FileDetail {
  created_at?: Date;
  id: number;
  is_missing: boolean;
  mime_type?: string;
  name?: string;
  project_id?: number;
  size?: number;
  storage_path?: string;
}

export async function checkFilesExist(fileIds: number[]): Promise<{ existing_files: FileDetail[]; missing_files: FileDetail[] }> {
  const results = await Promise.all(
    fileIds.map(async (id) => {
      const file = await findFileById(id);
      if (!file) return { id, is_missing: true };
      try {
        const [exists] = await bucket.file(file.storage_path).exists();
        return { ...file, is_missing: !exists };
      } catch {
        return { id, is_missing: true };
      }
    })
  );
  return {
    existing_files: results.filter((f) => !f.is_missing),
    missing_files: results.filter((f) => f.is_missing),
  };
}

export async function getByProject(req: Request, res: Response): Promise<void> {
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ message: 'Invalid project id', success: false });
    return;
  }
  const files = await getFilesByProject(projectId);
  res.json({ files: files, success: true });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const projectId = Number(req.params.projectId);
  const id = Number(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ message: 'Invalid project id', success: false });
    return;
  }
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid file id', success: false });
    return;
  }

  const file = await findFileById(id);
  if (!file) {
    res.status(404).json({ message: 'File not found', success: false });
    return;
  }
  if (file.project_id !== projectId) {
    res.status(404).json({ message: 'File is not accessible', success: false });
    return;
  }

  await bucket.file(file.storage_path).delete();
  await deleteFile(id);
  res.status(204).send();
}

export async function upload(req: Request, res: Response): Promise<void> {
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ message: 'Invalid project id', success: false });
    return;
  }

  const files = req.files as Express.MulterFile[] | undefined;

  if (!files || files.length === 0) {
    res.status(400).json({ message: 'No files provided', success: false });
    return;
  }

  const created = await Promise.all(
    files.map(async (newFile: Express.MulterFile) => {
      const filePathName = `files/projects/${projectId.toString()}/${uuidv4()}-${newFile.originalname}`;
      const bucketFile = bucket.file(filePathName);

      await bucketFile.save(newFile.buffer, { contentType: newFile.mimetype, resumable: false });

      return createFile({
        mime_type: newFile.mimetype,
        name: newFile.originalname,
        project_id: projectId,
        size: newFile.size,
        storage_path: filePathName,
      });
    })
  );

  res.status(201).json({ files: created, success: true });
}
