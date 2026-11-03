import http from './http';

export const listAdminFiles = () => http.get('/admin/files').then((r: any) => r.data);
