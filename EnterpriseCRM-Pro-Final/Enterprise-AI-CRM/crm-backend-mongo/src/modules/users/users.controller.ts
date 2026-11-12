import { Response, NextFunction } from 'express';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as usersService from '@/modules/users/users.service';

export async function list(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const users = await usersService.listUsers(req.user!.companyId);
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getUser(req.user!.companyId, req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await usersService.createUser(req.user!, req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await usersService.updateUser(
      req.user!,
      req.params.id,
      req.body,
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await usersService.deleteUser(req.user!, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
