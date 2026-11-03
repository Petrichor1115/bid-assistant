import http from './http';

export const getDashboard = (params?: { period?: string }) =>
  http.get('/dashboard', { params }).then((r: any) => r.data);
