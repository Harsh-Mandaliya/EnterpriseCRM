import { Team, User } from '@/models';
import type { AuthUser } from '@/middlewares/auth.middleware';
import { ApiError } from '@/utils/apiError';
import { audit } from '@/utils/audit';

const POPULATE = [
  { path: 'managerId', select: 'name role' },
  { path: 'memberIds', select: 'name role' },
];

interface PopulatedUser {
  _id: { toString(): string };
  name: string;
  role: string;
}

function toTeamJson(doc: InstanceType<typeof Team>) {
  const json = doc.toJSON() as Record<string, unknown>;
  const manager = doc.managerId as unknown as PopulatedUser | null;
  const members = (doc.memberIds as unknown as PopulatedUser[]).filter(m => m && 'name' in m);

  return {
    ...json,
    managerId: manager ? manager._id.toString() : null,
    manager: manager ? { id: manager._id.toString(), name: manager.name, role: manager.role } : null,
    memberIds: members.map(m => m._id.toString()),
    members: members.map(m => ({ id: m._id.toString(), name: m.name, role: m.role })),
  };
}

/**
 * Manager must be a MANAGER or ADMIN of this company; members
 * must belong to this company. Duplicates are removed.
 */
async function validateMembership(
  companyId: string,
  input: { managerId?: string | null; memberIds?: string[] },
) {
  if (input.managerId) {
    const manager = await User.findOne({ _id: input.managerId, companyId })
      .select('role')
      .lean();
    if (!manager) {
      throw ApiError.badRequest('Manager not found in your company');
    }
    if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN') {
      throw ApiError.badRequest('Team manager must have the MANAGER or ADMIN role');
    }
  }

  if (input.memberIds) {
    const unique = [...new Set(input.memberIds)];
    const count = await User.countDocuments({ _id: { $in: unique }, companyId });
    if (count !== unique.length) {
      throw ApiError.badRequest('Every member must belong to your company');
    }
    input.memberIds = unique;
  }
}

export async function listTeams(companyId: string) {
  const teams = await Team.find({ companyId }).populate(POPULATE).sort({ name: 1 });
  return teams.map(toTeamJson);
}

export async function getTeam(companyId: string, id: string) {
  const team = await Team.findOne({ _id: id, companyId }).populate(POPULATE);
  if (!team) throw ApiError.notFound('Team not found');
  return toTeamJson(team);
}

export async function createTeam(
  actor: AuthUser,
  input: { name: string; territory?: string | null; managerId?: string | null; memberIds?: string[] },
) {
  await validateMembership(actor.companyId, input);

  const team = await Team.create({
    companyId: actor.companyId,
    name: input.name,
    territory: input.territory ?? null,
    managerId: input.managerId ?? null,
    memberIds: input.memberIds ?? [],
  });

  await audit({
    companyId: actor.companyId,
    actorId: actor.userId,
    action: 'team.created',
    targetType: 'Team',
    targetId: team._id.toString(),
    metadata: { name: team.name, managerId: input.managerId ?? null, members: team.memberIds.length },
  });

  await team.populate(POPULATE);
  return toTeamJson(team);
}

export async function updateTeam(
  actor: AuthUser,
  id: string,
  input: { name?: string; territory?: string | null; managerId?: string | null; memberIds?: string[] },
) {
  const team = await Team.findOne({ _id: id, companyId: actor.companyId });
  if (!team) throw ApiError.notFound('Team not found');

  await validateMembership(actor.companyId, input);

  if (input.name !== undefined) team.name = input.name;
  if (input.territory !== undefined) team.territory = input.territory;
  if (input.managerId !== undefined) team.set('managerId', input.managerId);
  if (input.memberIds !== undefined) team.set('memberIds', input.memberIds);

  await team.save();

  await audit({
    companyId: actor.companyId,
    actorId: actor.userId,
    action: 'team.updated',
    targetType: 'Team',
    targetId: id,
    metadata: { fields: Object.keys(input) },
  });

  await team.populate(POPULATE);
  return toTeamJson(team);
}

export async function deleteTeam(actor: AuthUser, id: string) {
  const team = await Team.findOneAndDelete({ _id: id, companyId: actor.companyId });
  if (!team) throw ApiError.notFound('Team not found');

  await audit({
    companyId: actor.companyId,
    actorId: actor.userId,
    action: 'team.deleted',
    targetType: 'Team',
    targetId: id,
    metadata: { name: team.name },
  });
}

/** Removes a deleted user from every team (and as manager). */
export async function removeUserFromTeams(companyId: string, userId: string) {
  await Team.updateMany({ companyId, memberIds: userId }, { $pull: { memberIds: userId } });
  await Team.updateMany({ companyId, managerId: userId }, { $set: { managerId: null } });
}
