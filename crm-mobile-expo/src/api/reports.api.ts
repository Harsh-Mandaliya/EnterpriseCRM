import { apiClient } from '@/api/client';
import type { SalesReportRow, LeadConversionRow, TopCustomerRow } from '@/types';

export async function getSalesReport(months?: number): Promise<SalesReportRow[]> {
  const { data } = await apiClient.get<SalesReportRow[]>('/reports/sales', { params: { months } });
  return data;
}

export async function getLeadConversionReport(): Promise<LeadConversionRow[]> {
  const { data } = await apiClient.get<LeadConversionRow[]>('/reports/leads');
  return data;
}

export async function getTopCustomersReport(limit?: number): Promise<TopCustomerRow[]> {
  const { data } = await apiClient.get<TopCustomerRow[]>('/reports/top-customers', { params: { limit } });
  return data;
}
