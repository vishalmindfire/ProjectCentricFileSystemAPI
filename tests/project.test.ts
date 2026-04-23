import type { Express } from 'express';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';

jest.mock('#models/projectModel.js', () => ({
  createProject: jest.fn(),
  deleteProject: jest.fn(),
  getProjectById: jest.fn(),
  getProjects: jest.fn(),
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

import { createApp } from '#app.js';
import { createProject, deleteProject, getProjectById, getProjects } from '#models/projectModel.js';
import jwt from 'jsonwebtoken';

const mockCreateProject = createProject as jest.MockedFunction<typeof createProject>;
const mockDeleteProject = deleteProject as jest.MockedFunction<typeof deleteProject>;
const mockGetProjectById = getProjectById as jest.MockedFunction<typeof getProjectById>;
const mockGetProjects = getProjects as jest.MockedFunction<typeof getProjects>;
const mockJwtVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>;

interface Project {
  created_at: Date;
  description: string;
  files_count: number;
  id: number;
  jobs_count: number;
  name: string;
}
const mockProjects: Project[] = [
  {
    created_at: new Date('2024-01-01'),
    description: 'Test description',
    files_count: 0,
    id: 1,
    jobs_count: 0,
    name: 'Test Project',
  },
  {
    created_at: new Date('2025-01-01'),
    description: 'Test description 2',
    files_count: 3,
    id: 2,
    jobs_count: 2,
    name: 'Test Project 2',
  },
];

const AUTH_COOKIE = 'access_token=valid-token';

describe('Projects endpoints', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    mockJwtVerify.mockReturnValue({ email: 'test@test.com', id: 1 } as never);
    app = createApp();
  });

  describe('POST /api/projects', () => {
    it('not authenticated then return 401 status', async () => {
      const res = await request(app).post('/api/projects').send({ description: 'desc', name: 'proj' });
      expect(res.status).toBe(401);
    });

    it('name is missing then reutn 400 status', async () => {
      const res = await request(app).post('/api/projects').set('Cookie', AUTH_COOKIE).send({ description: 'Test description' });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Name and Description are required', success: false });
    });

    it('description is missing then return 400 status', async () => {
      const res = await request(app).post('/api/projects').set('Cookie', AUTH_COOKIE).send({ name: 'Test Project' });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Name and Description are required', success: false });
    });

    it('no fileds passed then return 400 status', async () => {
      const res = await request(app).post('/api/projects').set('Cookie', AUTH_COOKIE).send({});
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Name and Description are required', success: false });
    });

    it('creates project and returns 201 with project data', async () => {
      mockCreateProject.mockResolvedValueOnce(mockProjects[0]);
      const res = await request(app).post('/api/projects').set('Cookie', AUTH_COOKIE).send({ description: 'Test description', name: 'Test Project' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        project: {
          description: 'Test description',
          files_count: 0,
          id: 1,
          jobs_count: 0,
          name: 'Test Project',
        },
        success: true,
      });
      expect(mockCreateProject).toHaveBeenCalledWith({ description: 'Test description', name: 'Test Project' });
    });
  });

  describe('GET /api/projects', () => {
    it('not authenticated then returns 401 status', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ message: 'Not authenticated' });
    });

    it('list all projects then return projects array and 200 status', async () => {
      mockGetProjects.mockResolvedValueOnce(mockProjects);
      const res = await request(app).get('/api/projects').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(200);
      expect((res.body as { projects: Project[]; success: boolean }).projects).toHaveLength(2);
      expect((res.body as { projects: Project[]; success: boolean }).success).toBe(true);
      expect((res.body as { projects: Project[]; success: boolean }).projects[0]).toMatchObject({
        description: 'Test description',
        files_count: 0,
        id: 1,
        jobs_count: 0,
        name: 'Test Project',
      });
      expect((res.body as { projects: Project[]; success: boolean }).projects[1]).toMatchObject({
        description: 'Test description 2',
        files_count: 3,
        id: 2,
        jobs_count: 2,
        name: 'Test Project 2',
      });
    });

    it('no projects exist then return empty array and 200 status', async () => {
      mockGetProjects.mockResolvedValueOnce([]);
      const res = await request(app).get('/api/projects').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        projects: [],
        success: true,
      });
    });
  });

  describe('GET /api/projects/:id', () => {
    it('not authenticated then return 401 status', async () => {
      const res = await request(app).get('/api/projects/1');
      expect(res.status).toBe(401);
    });

    it('invalid project id then return 400 status', async () => {
      const res = await request(app).get('/api/projects/abc').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Invalid project id', success: false });
    });

    it('project not found then return 404 status', async () => {
      mockGetProjectById.mockResolvedValueOnce(null);
      const res = await request(app).get('/api/projects/99').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: 'Project not found', success: false });
    });

    it('project found then return 200 status', async () => {
      mockGetProjectById.mockResolvedValueOnce(mockProjects[0]);
      const res = await request(app).get('/api/projects/1').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(200);
      expect((res.body as { project: Project; success: boolean }).success).toBe(true);
      expect((res.body as { project: Project; success: boolean }).project).toMatchObject({
        description: 'Test description',
        id: 1,
        name: 'Test Project',
      });
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('not authenticated then return 401 status', async () => {
      const res = await request(app).delete('/api/projects/1');
      expect(res.status).toBe(401);
    });

    it('invalid id then return 400 status', async () => {
      const res = await request(app).delete('/api/projects/abc').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ message: 'Invalid project id', success: false });
    });

    it('project not found then return returns 404 status', async () => {
      mockDeleteProject.mockResolvedValueOnce(false);
      const res = await request(app).delete('/api/projects/99').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: 'Project not found', success: false });
    });

    it('deletes project then returns 204 status', async () => {
      mockDeleteProject.mockResolvedValueOnce(true);
      const res = await request(app).delete('/api/projects/1').set('Cookie', AUTH_COOKIE);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
      expect(mockDeleteProject).toHaveBeenCalledWith(1);
    });
  });
});
