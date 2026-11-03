import http from './http';

export const getResults = (projectId: string, params?: Record<string, unknown>) =>
  http.get(`/projects/${projectId}/results`, { params }).then((r: any) => r.data);

export const listIssues = (projectId: string, params?: Record<string, unknown>) =>
  http.get(`/projects/${projectId}/issues`, { params }).then((r: any) => r.data);

export const updateIssue = (issueId: string, isResolved: boolean) =>
  http.put(`/issues/${issueId}`, { is_resolved: isResolved ? 1 : 0 }).then((r: any) => r.data);
