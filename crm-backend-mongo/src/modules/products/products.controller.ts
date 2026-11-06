import { Response, NextFunction } from 'express';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as productsService from '@/modules/products/products.service';

export async function list(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const products = await productsService.listProducts(req.user!.companyId, { category, search });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const product = await productsService.getProduct(req.user!.companyId, req.params.id);
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const product = await productsService.createProduct(req.user!.companyId, req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const product = await productsService.updateProduct(req.user!.companyId, req.params.id, req.body);
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await productsService.deleteProduct(req.user!.companyId, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
