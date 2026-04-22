import type { Express } from 'express';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';

jest.mock('#models/fileModel.js', () => ({
  createFile: jest.fn(),
  deleteFile: jest.fn(),
  findFileById: jest.fn(),
  getFilesByProject: jest.fn(),
}));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));
jest.mock('#config/dbConnector.js', () => ({ default: {} }));
jest.mock('#config/gcsClient.js', () => {
  const mockFile = {
    delete: jest.fn(() => Promise.resolve()),
    exists: jest.fn(() => Promise.resolve([true])),
    save: jest.fn(() => Promise.resolve()),
  };
  return {
    __esModule: true,
    bucket: { file: jest.fn(() => mockFile) },
  };
});
jest.mock('#middleware/upload.js', () => ({
  __esModule: true,
  default: {
    array: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
      const contentType = (req.headers as Record<string, string>)['content-type'] ?? '';
      if (contentType.includes('multipart/form-data')) {
        req.files = [
          { buffer: Buffer.from('file content'), mimetype: 'text/plain', originalname: 'test.txt', size: 12 },
          { buffer: Buffer.from('file content'), mimetype: 'application/pdf', originalname: 'report.pdf', size: 204800 },
        ];
      }
      next();
    },
  },
}));

import { createApp } from '#app.js';
import { createFile, deleteFile, findFileById, getFilesByProject } from '#models/fileModel.js';
import jwt from 'jsonwebtoken';

const mockCreateFile = createFile as jest.MockedFunction<typeof createFile>;
const mockDeleteFile = deleteFile as jest.MockedFunction<typeof deleteFile>;
const mockFindFileById = findFileById as jest.MockedFunction<typeof findFileById>;
const mockGetFilesByProject = getFilesByProject as jest.MockedFunction<typeof getFilesByProject>;
const mockJwtVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>;

interface ProjectFile {
  created_at: Date;
  id: number;
  mime_type: string;
  name: string;
  project_id: number;
  size: number;
  storage_path: string;
}

const mockFile: ProjectFile = {
  created_at: new Date('2024-01-01'),
  id: 1,
  mime_type: 'text/plain',
  name: 'test.txt',
  project_id: 1,
  size: 1024,
  storage_path: '/uploads/test.txt',
};

const mockFile2: ProjectFile = {
  created_at: new Date('2024-02-01'),
  id: 2,
  mime_type: 'application/pdf',
  name: 'report.pdf',
  project_id: 1,
  size: 204800,
  storage_path: '/uploads/report.pdf',
};

const AUTH_COOKIE = 'access_token=valid-token';

describe('Files endpoints', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    mockJwtVerify.mockReturnValue({ email: 'test@test.com', id: 1 } as never);
    app = createApp();
  });

  describe('GET /projects/:projectId/files', () => {
    it('not authenticated then return 401 status', async () => {
      const res = await request(app).get('/projects/1/files');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ message: 'Not authenticated' });
    });

    it('invalid project id then return 400 status', async () => {
      const res = await request(app).get('/projects/abc/files').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Invalid project id', success: false });
    });

    it('returns all files for project with 200 status', async () => {
      mockGetFilesByProject.mockResolvedValueOnce([mockFile, mockFile2]);
      const res = await request(app).get('/projects/1/files').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(200);
      expect((res.body as { files: ProjectFile[]; success: boolean }).files).toHaveLength(2);
      expect((res.body as { files: ProjectFile[]; success: boolean }).success).toBe(true);
      expect((res.body as { files: ProjectFile[]; success: boolean }).files[0]).toMatchObject({ id: 1, name: 'test.txt', project_id: 1 });
      expect((res.body as { files: ProjectFile[]; success: boolean }).files[1]).toMatchObject({ id: 2, name: 'report.pdf', project_id: 1 });
    });

    it('no files exist then return empty array and 200 status', async () => {
      mockGetFilesByProject.mockResolvedValueOnce([]);
      const res = await request(app).get('/projects/1/files').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(200);
      expect(res.body as { files: ProjectFile[]; success: boolean }).toEqual({ files: [], success: true });
    });
  });

  describe('POST /projects/:projectId/files', () => {
    it('not authenticated then return 401 status', async () => {
      const res = await request(app).post('/projects/1/files');
      expect(res.status).toBe(401);
    });

    it('invalid project id then return 400 status', async () => {
      const res = await request(app).post('/projects/abc/files').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Invalid project id', success: false });
    });

    it('no files provided then return 400 status', async () => {
      const res = await request(app).post('/projects/1/files').set('Cookie', AUTH_COOKIE).send({});
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'No files provided', success: false });
    });

    it('uploads files and returns 201 with created file data', async () => {
      mockCreateFile.mockResolvedValueOnce(mockFile).mockResolvedValueOnce(mockFile2);
      const res = await request(app)
        .post('/projects/1/files')
        .set('Cookie', AUTH_COOKIE)
        .attach('files', Buffer.from('file content'), { contentType: 'text/plain', filename: 'test.txt' })
        .attach('files', Buffer.from('file content'), { contentType: 'application/pdf', filename: 'report.pdf' });
      expect(res.status).toBe(201);
      expect((res.body as { files: ProjectFile[]; success: boolean }).success).toBe(true);
      expect((res.body as { files: ProjectFile[]; success: boolean }).files).toHaveLength(2);
      expect((res.body as { files: ProjectFile[]; success: boolean }).files[0]).toMatchObject({ id: 1, name: 'test.txt', project_id: 1 });
      expect((res.body as { files: ProjectFile[]; success: boolean }).files[1]).toMatchObject({ id: 2, name: 'report.pdf', project_id: 1 });
    });
  });

  describe('DELETE /projects/:projectId/files/:id', () => {
    it('not authenticated then return 401 status', async () => {
      const res = await request(app).delete('/projects/1/files/1');
      expect(res.status).toBe(401);
    });

    it('invalid project id then return 400 status', async () => {
      const res = await request(app).delete('/projects/abc/files/1').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Invalid project id', success: false });
    });

    it('invalid file id then return 400 status', async () => {
      const res = await request(app).delete('/projects/1/files/abc').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Invalid file id', success: false });
    });

    it('file not found then return 404 status', async () => {
      mockFindFileById.mockResolvedValueOnce(null);
      const res = await request(app).delete('/projects/1/files/99').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: 'File not found', success: false });
    });

    it('file belongs to different project then return 404 status', async () => {
      mockFindFileById.mockResolvedValueOnce({ ...mockFile, project_id: 2 });
      const res = await request(app).delete('/projects/1/files/1').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: 'File is not accessible', success: false });
    });

    it('deletes file and returns 204 status', async () => {
      mockFindFileById.mockResolvedValueOnce(mockFile);
      mockDeleteFile.mockResolvedValueOnce(mockFile);
      const res = await request(app).delete('/projects/1/files/1').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(204);
      expect(mockDeleteFile).toHaveBeenCalledWith(1);
    });
  });
});
