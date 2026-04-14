import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { parentPort, workerData } from 'worker_threads';

interface ProgressMessage {
  bytesProcessed: number;
  bytesTotal: number;
  percent: number;
  type: 'progress';
}

interface ResultMessage {
  error?: string;
  type: 'result';
  zipPath?: string;
}

interface WorkerInput {
  files: { name: string; storage_path: string }[];
  jobId: number;
  outputDir: string;
  projectId: number;
}

const { files, jobId, outputDir, projectId } = workerData as WorkerInput;

function getTotalBytes(): number {
  return files.reduce((total, file) => {
    try {
      return total + fs.statSync(file.storage_path).size;
    } catch {
      return total;
    }
  }, 0);
}

async function run(): Promise<void> {
  const zipPath = path.join(outputDir, `job-${String(projectId)}-${String(jobId)}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const bytesTotal = getTotalBytes();

  archive.on('progress', (p) => {
    const bytesProcessed = p.fs.processedBytes;
    const percent = bytesTotal > 0 ? Math.min(100, Math.round((bytesProcessed / bytesTotal) * 100)) : 0;
    const msg: ProgressMessage = { bytesProcessed, bytesTotal, percent, type: 'progress' };
    parentPort?.postMessage(msg);
  });

  await new Promise<void>((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    for (const file of files) {
      archive.file(file.storage_path, { name: file.name });
    }

    void archive.finalize();
  });

  const msg: ResultMessage = { type: 'result', zipPath };
  parentPort?.postMessage(msg);
}

run().catch((err: unknown) => {
  const msg: ResultMessage = {
    error: err instanceof Error ? err.message : 'Unknown error',
    type: 'result',
  };
  parentPort?.postMessage(msg);
});
