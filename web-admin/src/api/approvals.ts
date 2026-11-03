import http from './http';

export const listAdminApprovals = () => http.get('/admin/approvals').then((r: any) => r.data);
