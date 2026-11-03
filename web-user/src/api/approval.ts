import http from './http';

export const submitApproval = (projectId: string, versionNo?: number) =>
  http.post(`/projects/${projectId}/submit-approval`, { version_no: versionNo }).then((r: any) => r.data);

export const listApprovals = (projectId: string) =>
  http.get(`/projects/${projectId}/approvals`).then((r: any) => r.data);
