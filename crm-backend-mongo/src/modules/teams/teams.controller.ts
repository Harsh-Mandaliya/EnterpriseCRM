import { Response, NextFunction } from 'express';
import { AuthedRequest } from '@/middlewares/auth.middleware';
import * as teamsService from '@/modules/teams/teams.service';

export async function list(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await teamsService.listTeams(req.user!.companyId));
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await teamsService.getTeam(req.user!.companyId, req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await teamsService.createTeam(req.user!, req.body));
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await teamsService.updateTeam(req.user!, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await teamsService.deleteTeam(req.user!, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
