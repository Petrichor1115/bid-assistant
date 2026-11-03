import http from './http';

export const login = (body: { username: string; password: string; app: string }) =>
  http.post('/auth/login', body).then((r: any) => r.data);
