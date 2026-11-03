import http from './http';

export const uploadFile = (projectId: string, file: File, fileType: string) => {
  const form = new FormData();
  form.append('file', file);
  form.append('file_type', fileType);
  return http.post(`/projects/${projectId}/files`, form).then((r: any) => r.data);
};

export const listFiles = (projectId: string, params?: Record<string, unknown>) =>
  http.get(`/projects/${projectId}/files`, { params }).then((r: any) => r.data);

export const downloadUrl = (id: string) => `/api/files/${id}`;

export const deleteFile = (id: string) => http.delete(`/files/${id}`).then((r: any) => r.data);

export const identifyFiles = (files: File[]) => {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  return http.post('/files/identify', form).then((r: any) => r.data);
};
