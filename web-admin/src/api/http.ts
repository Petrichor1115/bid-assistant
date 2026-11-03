import axios from 'axios';
import { message } from 'antd';

const http = axios.create({
  baseURL: '/api',
});

// 请求拦截：自动附加 Bearer token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一错误提示
http.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && body.code !== 0) {
      message.error(body.message || '请求失败');
      return Promise.reject(body);
    }
    return body;
  },
  (error) => {
    message.error(error.response?.data?.message || '网络错误');
    return Promise.reject(error);
  }
);

export default http;
