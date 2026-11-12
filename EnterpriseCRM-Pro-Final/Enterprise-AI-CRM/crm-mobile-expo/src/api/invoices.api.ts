import { apiClient } from '@/api/client';
import type { Invoice, InvoiceStatus, InvoiceLineItem } from '@/types';

export async function listInvoices(params?: { status?: InvoiceStatus; customerId?: string }): Promise<Invoice[]> {
  const { data } = await apiClient.get<Invoice[]>('/invoices', { params });
  return data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.get<Invoice>(`/invoices/${id}`);
  return data;
}

interface InvoiceLineItemInput {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export async function createInvoice(input: {
  customerId: string;
  lineItems: InvoiceLineItemInput[];
  taxRate?: number;
  dueDate: string;
  notes?: string;
}): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>('/invoices', input);
  return data;
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
  const { data } = await apiClient.patch<Invoice>(`/invoices/${id}/status`, { status });
  return data;
}

export async function deleteInvoice(id: string): Promise<void> {
  await apiClient.delete(`/invoices/${id}`);
}
