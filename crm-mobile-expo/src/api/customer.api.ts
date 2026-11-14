import { apiClient } from '@/api/client';
import type {
  Customer,
  PaginatedResponse,
} from '@/types';

/* ============================================================
   LIST CUSTOMERS
============================================================ */

export interface ListCustomersParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function listCustomers(
  params: ListCustomersParams = {},
): Promise<PaginatedResponse<Customer>> {
  const { data } =
    await apiClient.get<PaginatedResponse<Customer>>(
      '/customers',
      {
        params: {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 20,
          search:
            params.search?.trim() || undefined,
        },
      },
    );

  return data;
}

/* ============================================================
   GET CUSTOMER
============================================================ */

export async function getCustomer(
  id: string,
): Promise<Customer> {
  const { data } =
    await apiClient.get<Customer>(
      `/customers/${id}`,
    );

  return data;
}

/* ============================================================
   CREATE CUSTOMER
============================================================ */

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  address?: string;
  notes?: string;
  ownerId?: string | null;
  sharedWithIds?: string[];
  /** Save even if the e-mail/phone already exists. */
  allowDuplicate?: boolean;
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<Customer> {
  const { data } =
    await apiClient.post<Customer>(
      '/customers',
      input,
    );

  return data;
}

/* ============================================================
   UPDATE CUSTOMER
============================================================ */

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  address?: string;
  notes?: string;
  ownerId?: string | null;
  sharedWithIds?: string[];
  allowDuplicate?: boolean;
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  const { data } =
    await apiClient.patch<Customer>(
      `/customers/${id}`,
      input,
    );

  return data;
}

/* ============================================================
   DELETE CUSTOMER
============================================================ */
