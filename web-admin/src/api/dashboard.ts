import http from './http';

export const getAdminDashboard = () => http.get('/admin/dashboard').then((r: any) => r.data);
