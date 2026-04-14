import type { FileDetail } from '#controllers/fileController.js';
import type { Request, Response } from 'express';

import { checkFilesExist } from '#controllers/fileController.js';
import { createJob, findJobById, getJobsByProject, updateJobProgress, updateJobStatus } from '#models/jobModel.js';
import path from 'path';
import { Worker } from 'worker_threads';

const outputDir = 'uploads/zips';

export async function create(req: Request, res: Response): Promise<void> {
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ message: 'Invalid project id' });
    return;
  }

  const { fileIds } = req.body as { fileIds: number[] };
  const { ignore } = req.body as { ignore: boolean | undefined };
  const selectedFileIds = fileIds;
  if (!Array.isArray(selectedFileIds) || selectedFileIds.length === 0) {
    res.status(400).json({ message: 'selectFiles must be a non-empty array of file ids' });
    return;
  }

  const { existing_files, missing_files } = await checkFilesExist(selectedFileIds);

  if (!ignore) {
    if (missing_files.length > 0) {
      res.status(400).json({ message: 'Some files are missing', missing_files });
      return;
    }
  }

  if (existing_files.length === 0) {
    res.status(400).json({ message: 'No files to zip' });
    return;
  }

  const job = await createJob(projectId);
  await updateJobStatus(job.id, 'PROCESSING');

  const workerPath = new URL('../workers/zipWorker.js', import.meta.url).pathname;

  const worker = new Worker(workerPath, {
    workerData: {
      files: existing_files.map((f: FileDetail) => ({ name: f.name, storage_path: f.storage_path })),
      jobId: job.id,
      outputDir,
      projectId: projectId,
    },
  });

  worker.on('message', (msg: { bytesProcessed?: number; bytesTotal?: number; error?: string; percent?: number; type: string; zipPath?: string }) => {
    if (msg.type === 'progress') {
      void updateJobProgress(job.id, msg.percent ?? 0);
    } else {
      if (msg.error ?? !msg.zipPath) {
        void updateJobStatus(job.id, 'FAILED');
      } else {
        void updateJobStatus(job.id, 'COMPLETED', msg.zipPath);
      }
    }
  });

  worker.on('error', () => {
    void updateJobStatus(job.id, 'FAILED');
  });

  res.status(202).json(job);
}

export async function download(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid job id' });
    return;
  }

  const job = await findJobById(id);
  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }
  if (job.status !== 'COMPLETED' || !job.zip_path) {
    res.status(400).json({ message: 'Job is not completed yet' });
    return;
  }

  const filename = path.basename(job.zip_path);
  res.download(job.zip_path, filename);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid job id' });
    return;
  }

  const job = await findJobById(id);
  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  res.json(job);
}

export async function getByProject(req: Request, res: Response): Promise<void> {
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ message: 'Invalid project id' });
    return;
  }

  const jobs = await getJobsByProject(projectId);
  res.json(jobs);
}
