import type { Express } from 'express';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import request from 'supertest';

const ZIPS_DIR = path.resolve(__dirname, 'zips');
console.log(ZIPS_DIR);
fs.mkdirSync(ZIPS_DIR, { recursive: true });

jest.mock('#models/jobModel.js', () => ({
  createJob: jest.fn(),
  findJobById: jest.fn(),
  getJobsByProject: jest.fn(),
  updateJobProgress: jest.fn(),
  updateJobStatus: jest.fn(),
}));
jest.mock('#controllers/fileController.js', () => ({
  checkFilesExist: jest.fn(),
  getByProject: jest.fn(),
  remove: jest.fn(),
  upload: jest.fn(),
}));
jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
}));
jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  existsSync: jest.fn().mockReturnValue(true),
}));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));
jest.mock('#config/dbConnector.js', () => ({ default: {} }));
jest.mock('#middleware/upload.js', () => ({
  __esModule: true,
  default: {
    array: () => (_req: unknown, _res: unknown, next: () => void) => {
      next();
    },
  },
}));

import type { Job } from '#models/jobModel.js';

import { createApp } from '#app.js';
import { checkFilesExist } from '#controllers/fileController.js';
import { ProjectFile } from '#models/fileModel.js';
import { createJob, findJobById, getJobsByProject, updateJobStatus } from '#models/jobModel.js';
import jwt from 'jsonwebtoken';

const mockCheckFilesExist = checkFilesExist as jest.MockedFunction<typeof checkFilesExist>;
const mockCreateJob = createJob as jest.MockedFunction<typeof createJob>;
const mockFindJobById = findJobById as jest.MockedFunction<typeof findJobById>;
const mockGetJobsByProject = getJobsByProject as jest.MockedFunction<typeof getJobsByProject>;
const mockUpdateJobStatus = updateJobStatus as jest.MockedFunction<typeof updateJobStatus>;
const mockJwtVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>;

const mockJob: Job = {
  completed_at: null,
  created_at: new Date('2024-01-01'),
  id: 1,
  progress: 0,
  project_id: 1,
  status: 'PENDING',
  zip_path: null,
};

const mockJob2: Job = {
  completed_at: new Date('2024-01-02'),
  created_at: new Date('2024-01-01'),
  id: 2,
  progress: 100,
  project_id: 1,
  status: 'COMPLETED',
  zip_path: '/zips/job-1-2.zip',
};

const AUTH_COOKIE = 'access_token=valid-token';

describe('Jobs endpoints', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    mockJwtVerify.mockReturnValue({ email: 'test@test.com', id: 1 } as never);
    app = createApp();
  });

  describe('GET /projects/:projectId/jobs', () => {
    it('not authenticated then return 401 status', async () => {
      const res = await request(app).get('/projects/1/jobs');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ message: 'Not authenticated' });
    });

    it('invalid project id then return 400 status', async () => {
      const res = await request(app).get('/projects/abc/jobs').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Invalid project id' });
    });

    it('returns all jobs for project with 200 status', async () => {
      mockGetJobsByProject.mockResolvedValueOnce([mockJob, mockJob2]);
      const res = await request(app).get('/projects/1/jobs').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(200);
      expect((res.body as { jobs: Job[]; success: boolean }).success).toBe(true);
      expect((res.body as { jobs: Job[]; success: boolean }).jobs).toHaveLength(2);
      expect((res.body as { jobs: Job[]; success: boolean }).jobs[0]).toMatchObject({ id: 1, project_id: 1, status: 'PENDING' });
      expect((res.body as { jobs: Job[]; success: boolean }).jobs[1]).toMatchObject({ id: 2, project_id: 1, status: 'COMPLETED' });
    });

    it('no jobs exist then return empty array and 200 status', async () => {
      mockGetJobsByProject.mockResolvedValueOnce([]);
      const res = await request(app).get('/projects/1/jobs').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(200);
      expect((res.body as { jobs: Job[]; success: boolean }).success).toBe(true);
      expect((res.body as { jobs: Job[]; success: boolean }).jobs).toEqual([]);
    });
  });

  describe('POST /projects/:projectId/jobs', () => {
    it('not authenticated then return 401 status', async () => {
      const res = await request(app)
        .post('/projects/1/jobs')
        .send({ fileIds: [1] });
      expect(res.status).toBe(401);
    });

    it('invalid project id then return 400 status', async () => {
      const res = await request(app)
        .post('/projects/abc/jobs')
        .set('Cookie', AUTH_COOKIE)
        .send({ fileIds: [1] });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Invalid project id' });
    });

    it('no fileIds provided then return 400 status', async () => {
      const res = await request(app).post('/projects/1/jobs').set('Cookie', AUTH_COOKIE).send({});
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'No files selected for the job' });
    });

    it('empty fileIds array then return 400 status', async () => {
      const res = await request(app).post('/projects/1/jobs').set('Cookie', AUTH_COOKIE).send({ fileIds: [] });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'No files selected for the job' });
    });

    it('some files missing without ignore flag then return 200 status', async () => {
      mockCheckFilesExist.mockResolvedValueOnce({
        existing_files: [{ id: 2, is_missing: false }],
        missing_files: [{ id: 1, is_missing: true }],
      });
      const res = await request(app)
        .post('/projects/1/jobs')
        .set('Cookie', AUTH_COOKIE)
        .send({ fileIds: [1] });
      expect(res.status).toBe(200);
      expect(res.body as { message: string; missing_files: ProjectFile[]; success: boolean }).toMatchObject({
        message: 'Some files are missing',
        missing_files: [{ id: 1, is_missing: true }],
        success: false,
      });
    });

    it('all files missing with ignore flag then return 400 status', async () => {
      mockCheckFilesExist.mockResolvedValueOnce({
        existing_files: [],
        missing_files: [{ id: 1, is_missing: true }],
      });
      const res = await request(app)
        .post('/projects/1/jobs')
        .set('Cookie', AUTH_COOKIE)
        .send({ fileIds: [1], ignoreMissing: true });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'No files to zip' });
    });

    it('creates job and returns 202 status', async () => {
      mockCheckFilesExist.mockResolvedValueOnce({
        existing_files: [{ id: 1, is_missing: false, name: 'test.txt', storage_path: '/uploads/test.txt' }],
        missing_files: [],
      });
      mockCreateJob.mockResolvedValueOnce(mockJob);
      mockUpdateJobStatus.mockResolvedValueOnce({ ...mockJob, status: 'PROCESSING' });
      const res = await request(app)
        .post('/projects/1/jobs')
        .set('Cookie', AUTH_COOKIE)
        .send({ fileIds: [1] });
      expect(res.status).toBe(202);
      expect((res.body as { job: Job; success: boolean }).success).toBe(true);
      expect((res.body as { job: Job; success: boolean }).job).toMatchObject({ id: 1, project_id: 1, status: 'PENDING' });
      expect(mockCreateJob).toHaveBeenCalledWith(1);
    });

    it('creates job with ignore flag skipping missing files then return 202 status', async () => {
      mockCheckFilesExist.mockResolvedValueOnce({
        existing_files: [{ id: 1, is_missing: false, name: 'test.txt', storage_path: '/uploads/test.txt' }],
        missing_files: [{ id: 2, is_missing: true }],
      });
      mockCreateJob.mockResolvedValueOnce(mockJob);
      mockUpdateJobStatus.mockResolvedValueOnce({ ...mockJob, status: 'PROCESSING' });
      const res = await request(app)
        .post('/projects/1/jobs')
        .set('Cookie', AUTH_COOKIE)
        .send({ fileIds: [1, 2], ignoreMissing: true });
      expect(res.status).toBe(202);
      expect((res.body as { job: Job; success: boolean }).success).toBe(true);
      expect((res.body as { job: Job; success: boolean }).job).toMatchObject({ id: 1, project_id: 1 });
    });
  });

  describe('GET /projects/:projectId/jobs/:id', () => {
    it('not authenticated then return 401 status', async () => {
      const res = await request(app).get('/projects/1/jobs/1');
      expect(res.status).toBe(401);
    });

    it('invalid job id then return 400 status', async () => {
      const res = await request(app).get('/projects/1/jobs/abc').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Invalid job id' });
    });

    it('job not found then return 404 status', async () => {
      mockFindJobById.mockResolvedValueOnce(null);
      const res = await request(app).get('/projects/1/jobs/99').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: 'Job not found' });
    });

    it('job found then return 200 status with job data', async () => {
      mockFindJobById.mockResolvedValueOnce(mockJob);
      const res = await request(app).get('/projects/1/jobs/1').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(200);
      expect((res.body as { job: Job; success: boolean }).success).toBe(true);
      expect((res.body as { job: Job; success: boolean }).job).toMatchObject({ id: 1, project_id: 1, status: 'PENDING' });
    });
  });

  describe('GET /projects/:projectId/jobs/:id/download', () => {
    it('not authenticated then return 401 status', async () => {
      const res = await request(app).get('/projects/1/jobs/1/download');
      expect(res.status).toBe(401);
    });

    it('invalid job id then return 400 status', async () => {
      const res = await request(app).get('/projects/1/jobs/abc/download').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Invalid job id' });
    });

    it('job not found then return 404 status', async () => {
      mockFindJobById.mockResolvedValueOnce(null);
      const res = await request(app).get('/projects/1/jobs/99/download').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: 'Job not found' });
    });

    it('job not completed then return 400 status', async () => {
      mockFindJobById.mockResolvedValueOnce(mockJob);
      const res = await request(app).get('/projects/1/jobs/1/download').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Job is not completed yet' });
    });

    it('job completed and zip exists then return file download', async () => {
      const zipPath = path.join(ZIPS_DIR, 'job-1-2.zip');
      fs.writeFileSync(zipPath, 'zip content');
      mockFindJobById.mockResolvedValueOnce({ ...mockJob2, zip_path: zipPath });
      const res = await request(app).get('/projects/1/jobs/2/download').set('Cookie', AUTH_COOKIE);
      fs.unlinkSync(zipPath);
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('job-1-2.zip');
    });
  });
});
