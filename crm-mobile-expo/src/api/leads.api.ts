import { apiClient } from '@/api/client';
import type { ConvertLeadResult, DuplicateMatch, Lead, LeadSource, LeadStatus } from '@/types';

export async function listLeads(params?: {
  status?: LeadStatus;
  assignedToId?: string;
}): Promise<Lead[]> {
  const { data } = await apiClient.get<Lead[]>('/leads', { params });
  return data;
}

export async function getLead(id: string): Promise<Lead> {
  const { data } = await apiClient.get<Lead>(`/leads/${id}`);
  return data;
}

export async function createLead(input: {
  name: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  customerId?: string;
  assignedToId?: string;
  /** Save even if the e-mail/phone already exists. */
  allowDuplicate?: boolean;
}): Promise<Lead> {
  const { data } = await apiClient.post<Lead>('/leads', input);
  return data;
}

export async function updateLead(
  id: string,
  input: Partial<{
    name: string;
    email: string;
    phone: string;
    source: LeadSource;
    assignedToId: string | null;
    customerId: string | null;
    allowDuplicate: boolean;
  }>,
): Promise<Lead> {
  const { data } = await apiClient.patch<Lead>(`/leads/${id}`, input);
  return data;
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<Lead> {
  const { data } = await apiClient.patch<Lead>(`/leads/${id}/status`, {
    status,
  });
  return data;
}

export async function deleteLead(id: string): Promise<void> {
  await apiClient.delete(`/leads/${id}`);
}

/* ============================================================
   CONVERSION
   POST /leads/:id/convert — creates/links the customer and,
   unless createDeal is false, a deal owned by the assignee.
============================================================ */

export async function convertLead(
  id: string,
  input: {
    customerId?: string;
    createDeal?: boolean;
    deal?: { title?: string; amount?: number; closeDate?: string };
  } = {},
): Promise<ConvertLeadResult> {
  const { data } = await apiClient.post<ConvertLeadResult>(
    `/leads/${id}/convert`,
    input,
  );
  return data;
}

/** GET /leads/duplicates — matching leads/customers by e-mail or phone. */
export async function findDuplicates(params: {
  email?: string;
  phone?: string;
  excludeId?: string;
}): Promise<DuplicateMatch[]> {
  const { data } = await apiClient.get<{ duplicates: DuplicateMatch[] }>(
    '/leads/duplicates',
    { params },
  );
  return data.duplicates;
}
