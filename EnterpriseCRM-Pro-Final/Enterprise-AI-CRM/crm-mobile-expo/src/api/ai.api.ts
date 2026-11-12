import { apiClient } from '@/api/client';
import type { LeadScore, SalesForecast, NextBestAction, CustomerInsight } from '@/types';

export async function getLeadScores(): Promise<LeadScore[]> {
  const { data } = await apiClient.get<LeadScore[]>('/ai/lead-scores');
  return data;
}

export async function getSalesForecast(): Promise<SalesForecast> {
  const { data } = await apiClient.get<SalesForecast>('/ai/sales-forecast');
  return data;
}

export async function getNextBestActions(): Promise<NextBestAction[]> {
  const { data } = await apiClient.get<NextBestAction[]>('/ai/next-best-actions');
  return data;
}

export async function getCustomerInsights(): Promise<{ atRiskCustomers: CustomerInsight[]; basis: string }> {
  const { data } = await apiClient.get('/ai/customer-insights');
  return data;
}
