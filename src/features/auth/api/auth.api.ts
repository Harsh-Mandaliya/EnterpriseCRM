import { api } from '@/api/axios';
import { LoginRequest } from '../types/auth.types';

export const loginUser = async (
  data: LoginRequest,
) => {
  const response = await api.post(
    '/auth/login',
    data,
  );

  return response.data;
};