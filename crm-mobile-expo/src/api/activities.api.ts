import { apiClient } from '@/api/client';

import type {
  Activity,
  ActivityType,
} from '@/types';

/* ============================================================
   LIST ACTIVITIES
   ============================================================ */

export async function listActivities(params?: {
  customerId?: string;
  leadId?: string;
  opportunityId?: string;
}): Promise<Activity[]> {
  const { data } = await apiClient.get<Activity[]>(
    '/activities',
    {
      params,
    },
  );

  return data;
}

/* ============================================================
   CREATE ACTIVITY
   ============================================================ */

export async function createActivity(input: {
  type: ActivityType;
  summary: string;
  notes?: string;
  dueAt?: string;
  customerId?: string;
  leadId?: string;
  opportunityId?: string;
  /** A person, or null for a general team task (owner/admin/manager). */
  assignedToId?: string | null;
}): Promise<Activity> {
  const { data } = await apiClient.post<Activity>(
    '/activities',
    input,
  );

  return data;
}

/* ============================================================
   UPDATE ACTIVITY
   ------------------------------------------------------------
   Used only for editing activity information.
   
   IMPORTANT:
   status, completedAt and completedById are NOT accepted here.
   Those values are controlled by the backend.
   ============================================================ */

export async function updateActivity(
  id: string,
  input: Partial<{
    summary: string;
    notes: string;
    dueAt: string | null;
    type: ActivityType;
    customerId: string | null;
    leadId: string | null;
    opportunityId: string | null;
    assignedToId: string | null;
  }>,
): Promise<Activity> {
  const { data } = await apiClient.patch<Activity>(
    `/activities/${id}`,
    input,
  );

  return data;
}

/* ============================================================
   COMPLETE ACTIVITY
   ------------------------------------------------------------
   Backend determines:
   
     status        = COMPLETED
     completedById = authenticated user
     completedAt   = current server time
   
   Do NOT send completedAt or completedById from frontend.
   ============================================================ */

export async function completeActivity(
  id: string,
): Promise<Activity> {
  const { data } = await apiClient.patch<Activity>(
    `/activities/${id}/complete`,
  );

  return data;
}

/* ============================================================
   DELETE ACTIVITY
   ------------------------------------------------------------
   Backend enforces:
   
     OWNER
     ADMIN
   
   Other roles will receive HTTP 403.
   ============================================================ */

export async function deleteActivity(
  id: string,
): Promise<void> {
  await apiClient.delete(
    `/activities/${id}`,
  );
}
/* v1.4.2 — give a task to a person or make it a general team task
   (OWNER / ADMIN / MANAGER; others get 403). */
export async function assignActivity(id: string, assignedToId: string | null): Promise<Activity> {
  const { data } = await apiClient.patch<Activity>(`/activities/${id}/assign`, { assignedToId });
  return data;
}
