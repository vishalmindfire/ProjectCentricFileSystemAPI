import type { CreateProjectInput } from '#models/projectModel.js';
import type { Request, Response } from 'express';

import { createProject, deleteProject, getProjectById, getProjects } from '#models/projectModel.js';

export async function create(req: Request, res: Response): Promise<void> {
  const { description, name } = req.body as CreateProjectInput;

  if (!name || !description) {
    res.status(400).json({ message: 'Name and Description are required' });
    return;
  }

  const project = await createProject({ description, name });
  res.status(201).json({ project: project, success: true });
}

export async function getAll(_req: Request, res: Response): Promise<void> {
  const projects = await getProjects();
  res.json({ projects: projects, success: true });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid project id' });
    return;
  }

  const project = await getProjectById(id);
  if (!project) {
    res.status(404).json({ message: 'Project not found' });
    return;
  }

  res.json(project);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid project id' });
    return;
  }

  const deleted = await deleteProject(id);
  if (!deleted) {
    res.status(404).json({ message: 'Project not found' });
    return;
  }

  res.status(204).send();
}
