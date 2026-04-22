import type { FileDetail } from '#config/controllers/fileController.js';
import type { Request, Response } from 'express';

import { checkFilesExist } from '#config/controllers/fileController.js';
import { bucket } from '#config/gcsClient.js';
import { createJob, findJobById, getJobsByProject, updateJobProgress, updateJobStatus } from '#models/jobModel.js';
import path from 'path';
import { Worker } from 'worker_threads';

export async function create(req: Request, res: Response): Promise<void> {
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ message: 'Invalid project id', success: false });
    return;
  }

  const { fileIds } = req.body as { fileIds: number[] | undefined };
  const { ignoreMissing } = req.body as { ignoreMissing: boolean | undefined };
  const selectedFileIds = fileIds;
  if (!Array.isArray(selectedFileIds) || selectedFileIds.length === 0) {
    res.status(400).json({ message: 'No files selected for the job', success: false });
    return;
  }

  const { existing_files, missing_files } = await checkFilesExist(selectedFileIds);

  if (existing_files.length === 0) {
    res.status(400).json({ message: 'No files to zip', success: false });
    return;
  }

  if (!ignoreMissing) {
    if (missing_files.length > 0) {
      res.status(200).json({ message: 'Some files are missing', missing_files, success: false });
      return;
    }
  }

  const job = await createJob(projectId);
  await updateJobStatus(job.id, 'PROCESSING');
  const isDev = process.env.NODE_ENV !== 'production';
  const workerLocation = isDev ? 'src/workers/zipWorker.ts' : 'dist/src/workers/zipWorker.js';
  const workerPath = path.resolve(process.cwd(), workerLocation);
  const worker = new Worker(workerPath, {
    execArgv: isDev ? ['--import', 'tsx'] : [],
    workerData: {
      files: existing_files.map((f: FileDetail) => ({ name: f.name, size: f.size ?? 0, storage_path: f.storage_path })),
      jobId: job.id,
      projectId: projectId,
    },
  });

  worker.on('message', (msg: { bytesProcessed?: number; bytesTotal?: number; error?: string; percent?: number; type: string; zipPath?: string }) => {
    if (msg.type === 'progress') {
      void updateJobProgress(job.id, msg.percent ?? 0);
    } else {
      if (msg.error || !msg.zipPath) {
        void updateJobStatus(job.id, 'FAILED');
      } else {
        void updateJobStatus(job.id, 'COMPLETED', msg.zipPath);
      }
    }
  });

  worker.on('error', (error) => {
    console.log(error);
    void updateJobStatus(job.id, 'FAILED');
  });
  res.status(202).json({ job: job, success: true });
}

export async function download(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid job id', success: false });
    return;
  }

  const job = await findJobById(id);
  if (!job) {
    res.status(404).json({ message: 'Job not found', success: false });
    return;
  }
  if (job.status !== 'COMPLETED' || !job.zip_path) {
    res.status(400).json({ message: 'Job is not completed yet', success: false });
    return;
  }

  const filename = path.basename(job.zip_path);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/zip');
  bucket.file(job.zip_path).createReadStream().pipe(res);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid job id', success: false });
    return;
  }

  const job = await findJobById(id);
  if (!job) {
    res.status(404).json({ message: 'Job not found', success: false });
    return;
  }

  res.json({ job: job, success: true });
}

export async function getByProject(req: Request, res: Response): Promise<void> {
  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ message: 'Invalid project id', success: false });
    return;
  }

  const jobs = await getJobsByProject(projectId);
  res.json({ jobs: jobs, success: true });
}
