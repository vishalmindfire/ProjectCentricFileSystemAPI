import { Storage } from '@google-cloud/storage';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { parentPort, workerData } from 'worker_threads';

const storage = new Storage({
  credentials: {
    client_email: process.env.GCP_CREDENTIALS_CLIENT_EMAIL,
    private_key: process.env.GCP_CREDENTIALS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GCP_CREDENTIALS_PROJECT_ID,
});
const bucket = storage.bucket(process.env.GCP_BUCKET_NAME ?? '');

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
  let bytesProcessed = 0;
  let lastPercent = -1;

  await new Promise<void>((resolve, reject) => {
    outputStream.on('finish', resolve);
    outputStream.on('error', reject);
    archive.on('error', reject);
    archive.pipe(outputStream);

    for (const file of files) {
      const tracker = new PassThrough();
      tracker.on('data', (chunk: Buffer) => {
        bytesProcessed += chunk.length;
        const percent = bytesTotal > 0 ? Math.min(99, Math.round((bytesProcessed / bytesTotal) * 100)) : 0;
        if (percent !== lastPercent) {
          lastPercent = percent;
          const msg: ProgressMessage = { bytesProcessed, bytesTotal, percent, type: 'progress' };
          parentPort?.postMessage(msg);
        }
      });
      bucket.file(file.storage_path).createReadStream().pipe(tracker);
      archive.append(tracker, { name: file.name });
    }

    void archive.finalize();
    void outputStream.on('finish', () => {
      parentPort?.postMessage({ bytesProcessed, bytesTotal, percent: 100, type: 'progress' } satisfies ProgressMessage);
    });
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
