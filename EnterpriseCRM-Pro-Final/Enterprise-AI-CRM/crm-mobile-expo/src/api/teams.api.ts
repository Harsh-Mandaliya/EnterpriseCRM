import { apiClient } from '@/api/client';
import type { Team } from '@/types';

export interface TeamInput {
  name: string;
  territory?: string | null;
  managerId?: string | null;
  memberIds?: string[];
}

/** GET /teams — every team in the company (any role). */
export async function listTeams(): Promise<Team[]> {
  const { data } = await apiClient.get<Team[]>('/teams');
  return data;
}

/** POST /teams — OWNER / ADMIN. */
export async function createTeam(input: TeamInput): Promise<Team> {
  const { data } = await apiClient.post<Team>('/teams', input);
  return data;
}

/** PATCH /teams/:id — OWNER / ADMIN. */
export async function updateTeam(id: string, input: Partial<TeamInput>): Promise<Team> {
  const { data } = await apiClient.patch<Team>(`/teams/${id}`, input);
  return data;
}

/** DELETE /teams/:id — OWNER / ADMIN. */
export async function deleteTeam(id: string): Promise<void> {
  await apiClient.delete(`/teams/${id}`);
}
