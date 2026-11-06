import { Request, Response, NextFunction } from 'express';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as companyService from '@/modules/company/company.service';

export async function getBranding(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await companyService.getBrandingForUser(req.user!));
  } catch (err) {
    next(err);
  }
}

export async function updateBranding(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await companyService.updateBranding(req.user!, req.body));
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await companyService.updateProfile(req.user!, req.body));
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await companyService.updatePreferences(req.user!, req.body));
  } catch (err) {
    next(err);
  }
}

export async function publicBranding(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await companyService.getPublicBranding(req.params.slug));
  } catch (err) {
    next(err);
  }
}
