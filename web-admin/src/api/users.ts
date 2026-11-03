import http from './http';

export const listUsers = (params?: Record<string, unknown>) =>
  http.get('/users', { params }).then((r: any) => r.data);

export const createUser = (body: Record<string, unknown>) =>
  http.post('/users', body).then((r: any) => r.data);

export const updateUser = (id: string, body: Record<string, unknown>) =>
  http.put(`/users/${id}`, body).then((r: any) => r.data);

export const deleteUser = (id: string) =>
  http.delete(`/users/${id}`).then((r: any) => r.data);
