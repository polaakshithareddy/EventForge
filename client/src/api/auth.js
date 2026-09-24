import apiClient from './client';

export const login = async (data) => {
  return apiClient.post('/auth/login', data);
};

export const register = async (data) => {
  return apiClient.post('/auth/register', data);
};

export const logout = async () => {
  return apiClient.post('/auth/logout');
};

export const getMe = async () => {
  return apiClient.get('/auth/me');
};
