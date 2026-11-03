import http from './http';

export const listProjects = (params?: Record<string, unknown>) =>
  http.get('/projects', { params }).then((r: any) => r.data);
