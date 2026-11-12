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

/* v1.4 — every role; the server limits results to the user's scope. */

export interface DealInsight {
  id: string;
  title: string;
  stage: string;
  amount: number;
  owner: string | null;
  customer: string | null;
  closeDate: string | null;
  probability: number;
  risk: 'low' | 'medium' | 'high';
  weighted: number;
  signals: { label: string; impact: number }[];
  nextStep: string;
}

export interface Briefing {
  headline: string;
  points: { icon: string; text: string; tone: 'good' | 'warn' | 'bad' | 'info' }[];
}

export async function getDealInsights(): Promise<{ deals: DealInsight[]; summary: { open: number; pipeline: number; weighted: number; highRisk: number } }> {
  const { data } = await apiClient.get('/ai/deal-insights');
  return data;
}

export async function getBriefing(): Promise<Briefing> {
  const { data } = await apiClient.get<Briefing>('/ai/briefing');
  return data;
}
