import { bucket } from '#config/gcsClient.js';
import archiver from 'archiver';
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
  files: { name: string; size: number; storage_path: string }[];
  jobId: number;
  projectId: number;
}

const { files, jobId, projectId } = workerData as WorkerInput;

async function run(): Promise<void> {
  const zipPath = `zips/job-${projectId.toString()}-${jobId.toString()}.zip`;
  const archive = archiver('zip', { zlib: { level: 9 } });
  const outputStream = bucket.file(zipPath).createWriteStream({ contentType: 'application/zip', resumable: false });

  const bytesTotal = files.reduce((sum, file) => sum + file.size, 0);

  archive.on('progress', (progressData) => {
    const bytesProcessed = progressData.fs.processedBytes;
    const percent = bytesTotal > 0 ? Math.min(100, Math.round((bytesProcessed / bytesTotal) * 100)) : 0;
    const msg: ProgressMessage = { bytesProcessed, bytesTotal, percent, type: 'progress' };
    parentPort?.postMessage(msg);
  });

  await new Promise<void>((resolve, reject) => {
    outputStream.on('finish', resolve);
    outputStream.on('error', reject);
    archive.on('error', reject);
    archive.pipe(outputStream);

    for (const file of files) {
      const readStream = bucket.file(file.storage_path).createReadStream();
      archive.append(readStream, { name: file.name });
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
