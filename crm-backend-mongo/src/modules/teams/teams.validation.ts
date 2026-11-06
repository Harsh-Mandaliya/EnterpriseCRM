import { z } from 'zod';
import { objectId } from '@/utils/objectId';

const teamFields = {
  name: z.string().trim().min(2).max(80),
  territory: z.string().trim().max(80).nullable(),
  managerId: objectId.nullable(),
  memberIds: z.array(objectId).max(500),
};

export const createTeamSchema = z.object({
  body: z
    .object({
      name: teamFields.name,
      territory: teamFields.territory.optional(),
      managerId: teamFields.managerId.optional(),
      memberIds: teamFields.memberIds.optional(),
    })
    .strict(),
});

export const updateTeamSchema = z.object({
  body: z
    .object({
      name: teamFields.name.optional(),
      territory: teamFields.territory.optional(),
      managerId: teamFields.managerId.optional(),
      memberIds: teamFields.memberIds.optional(),
    })
    .strict(),
});
