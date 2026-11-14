import { apiClient } from '@/api/client';
import type { Product } from '@/types';

export async function listProducts(params?: { category?: string; search?: string }): Promise<Product[]> {
  const { data } = await apiClient.get<Product[]>('/products', { params });
  return data;
}

export async function createProduct(input: {
  name: string;
  sku?: string;
  category?: string;
  description?: string;
  price: number;
  stockQty?: number;
}): Promise<Product> {
  const { data } = await apiClient.post<Product>('/products', input);
  return data;
}

export async function updateProduct(
  id: string,
  input: Partial<{ name: string; sku: string; category: string; description: string; price: number; stockQty: number; isActive: boolean }>,
): Promise<Product> {
  const { data } = await apiClient.patch<Product>(`/products/${id}`, input);
  return data;
}
