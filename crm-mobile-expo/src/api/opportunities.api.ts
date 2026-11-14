import { apiClient } from '@/api/client';
import type { Opportunity, OpportunityStage } from '@/types';

export async function listOpportunities(): Promise<Opportunity[]> {
  const { data } = await apiClient.get<Opportunity[]>('/opportunities');
  return data;
}

export async function createOpportunity(input: {
  title: string;
  amount: number;
  stage?: OpportunityStage;
  leadId?: string;
  customerId?: string;
  ownerId?: string;
  closeDate?: string;
}): Promise<Opportunity> {
  const { data } = await apiClient.post<Opportunity>('/opportunities', input);
  return data;
}

export async function updateOpportunity(
  id: string,
  input: Partial<{
    title: string;
    amount: number;
    stage: OpportunityStage;
    closeDate: string | null;
    customerId: string | null;
    leadId: string | null;
    ownerId: string | null;
  }>,
): Promise<Opportunity> {
  const { data } = await apiClient.patch<Opportunity>(
    `/opportunities/${id}`,
    input,
  );
  return data;
}

export async function updateOpportunityStage(
  id: string,
  stage: OpportunityStage,
): Promise<Opportunity> {
  const { data } = await apiClient.patch<Opportunity>(
    `/opportunities/${id}/stage`,
    { stage },
  );
  return data;
}
