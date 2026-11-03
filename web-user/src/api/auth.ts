import http from './http';

export const login = (body: { username: string; password: string; app: string }) =>
  http.post('/auth/login', body).then((r: any) => r.data);

export const me = () => http.get('/auth/me').then((r: any) => r.data);

export const logout = () => http.post('/auth/logout').then((r: any) => r.data);
