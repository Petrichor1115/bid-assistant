import http from './http';

export const listProjects = (params?: Record<string, unknown>) =>
  http.get('/projects', { params }).then((r: any) => r.data);

export const createProject = (body: Record<string, unknown>) =>
  http.post('/projects', body).then((r: any) => r.data);

export const getProject = (id: string) =>
  http.get(`/projects/${id}`).then((r: any) => r.data);

export const updateProject = (id: string, body: Record<string, unknown>) =>
  http.put(`/projects/${id}`, body).then((r: any) => r.data);

export const deleteProject = (id: string) =>
  http.delete(`/projects/${id}`).then((r: any) => r.data);

export const getTimeline = (id: string) =>
  http.get(`/projects/${id}/timeline`).then((r: any) => r.data);

export const getDiff = (id: string, from: number, to: number) =>
  http.get(`/projects/${id}/diff`, { params: { from, to } }).then((r: any) => r.data);
