import http from './http';

export const runAll = (projectId: string, versionNo?: number) =>
  http.post(`/projects/${projectId}/agent/run`, { version_no: versionNo }).then((r: any) => r.data);

export const runSingle = (projectId: string, name: string, versionNo?: number) =>
  http.post(`/projects/${projectId}/agent/${name}/run`, { version_no: versionNo }).then((r: any) => r.data);

export const listRuns = (projectId: string, versionNo?: number) =>
  http.get(`/projects/${projectId}/agent/runs`, { params: { version_no: versionNo } }).then((r: any) => r.data);

export const getRun = (runId: string) =>
  http.get(`/agent/runs/${runId}`).then((r: any) => r.data);

export const retry = (runId: string) =>
  http.post(`/agent/runs/${runId}/retry`).then((r: any) => r.data);
