import http from './http';

export const archive = (projectId: string) =>
  http.post(`/projects/${projectId}/archive`).then((r: any) => r.data);

export const getReport = (projectId: string) =>
  http.get(`/projects/${projectId}/report`).then((r: any) => r.data);

export const pdfUrl = (projectId: string) => `/api/projects/${projectId}/report/pdf`;
