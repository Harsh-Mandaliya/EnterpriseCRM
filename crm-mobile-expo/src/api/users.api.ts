import { apiClient } from '@/api/client';
import type { Role, TeamUser } from '@/types';

export async function listUsers(): Promise<TeamUser[]> {
  const { data } = await apiClient.get<TeamUser[]>('/users');
  return data;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<TeamUser> {
  const { data } = await apiClient.post<TeamUser>('/users', input);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
