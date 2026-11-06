import { apiClient } from '@/api/client';
import type { Payment, PaymentMethod } from '@/types';

export async function listPayments(params?: { invoiceId?: string }): Promise<Payment[]> {
  const { data } = await apiClient.get<Payment[]>('/payments', { params });
  return data;
}

export async function createPayment(input: {
  invoiceId: string;
  amount: number;
  method?: PaymentMethod;
  reference?: string;
  /** ISO date-time the money was received (defaults to now). */
  paidAt?: string;
}): Promise<{ payment: Payment; invoiceTotalPaid: number; invoiceStatus: string }> {
  const { data } = await apiClient.post('/payments', input);
  return data;
}

export async function getInvoicePaymentSummary(invoiceId: string): Promise<{
  invoiceTotal: number;
  totalPaid: number;
  balanceDue: number;
  status: string;
}> {
  const { data } = await apiClient.get(`/payments/invoice/${invoiceId}/summary`);
  return data;
}
