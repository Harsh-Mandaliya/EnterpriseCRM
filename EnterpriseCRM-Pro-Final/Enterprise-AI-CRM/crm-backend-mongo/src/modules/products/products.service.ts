import { Product } from '@/models';
import { ApiError } from '@/utils/apiError';

export async function listProducts(companyId: string, params: { category?: string; search?: string }) {
  const filter: Record<string, unknown> = { companyId };
  if (params.category) filter.category = params.category;
  if (params.search) {
    const regex = new RegExp(params.search, 'i');
    filter.$or = [{ name: regex }, { sku: regex }, { category: regex }];
  }
  const products = await Product.find(filter).sort({ name: 1 });
  return products.map(p => p.toJSON());
}

export async function getProduct(companyId: string, id: string) {
  const product = await Product.findOne({ _id: id, companyId });
  if (!product) throw ApiError.notFound('Product not found');
  return product.toJSON();
}

export async function createProduct(companyId: string, input: Record<string, unknown>) {
  const product = await Product.create({ ...input, companyId });
  return product.toJSON();
}

export async function updateProduct(companyId: string, id: string, input: Record<string, unknown>) {
  const existing = await Product.findOne({ _id: id, companyId });
  if (!existing) throw ApiError.notFound('Product not found');
  Object.assign(existing, input);
  await existing.save();
  return existing.toJSON();
}

export async function deleteProduct(companyId: string, id: string) {
  const existing = await Product.findOneAndDelete({ _id: id, companyId });
  if (!existing) throw ApiError.notFound('Product not found');
}
