import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://192.168.1.100:5000/api',
  timeout: 10000,
});

api.interceptors.request.use(config => {
  return config;
});

api.interceptors.response.use(
  response => response,

  error => {
    console.log(error.response);

    return Promise.reject(error);
  },
);