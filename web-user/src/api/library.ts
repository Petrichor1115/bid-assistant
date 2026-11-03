import http from './http';

export const getLibrary = (projectId: string) =>
  http.get(`/projects/${projectId}/competitor-library`).then((r: any) => r.data);

export const matchLibrary = (projectId: string, versionNo?: number) =>
  http.post(`/projects/${projectId}/competitor-library/match`, { version_no: versionNo }).then((r: any) => r.data);

export const getRecommendations = (projectId: string) =>
  http.get(`/projects/${projectId}/competitor-recommendations`).then((r: any) => r.data);

export const adoptRecommendation = (id: string) =>
  http.put(`/recommendations/${id}/adopt`).then((r: any) => r.data);

export const dismissRecommendation = (id: string) =>
  http.put(`/recommendations/${id}/dismiss`).then((r: any) => r.data);
