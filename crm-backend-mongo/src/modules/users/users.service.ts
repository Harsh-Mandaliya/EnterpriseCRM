import { User, RefreshToken } from '@/models';
import type { AuthUser } from '@/middlewares/auth.middleware';
import { hashPassword } from '@/utils/hash';
import { ApiError } from '@/utils/apiError';
import { audit } from '@/utils/audit';
import { removeUserFromTeams } from '@/modules/teams/teams.service';
import {
  canManageUserWithRole,
  type RoleName,
} from '@/utils/permissions';

export async function listUsers(companyId: string) {
  const users = await User.find({ companyId }).sort({ createdAt: 1 });
  return users.map(u => u.toJSON());
}

export async function getUser(companyId: string, id: string) {
  const user = await User.findOne({ _id: id, companyId });
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
}

export async function createUser(
  actor: AuthUser,
  input: { name: string; email: string; password: string; role: RoleName },
) {
  if (!canManageUserWithRole(actor.role, input.role)) {
    throw ApiError.forbidden(`You cannot create ${input.role} accounts`);
  }

  const existing = await User.exists({ email: input.email.toLowerCase() });
  if (existing) throw ApiError.conflict('Email already in use');

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    companyId: actor.companyId,
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
  });

  await audit({
    companyId: actor.companyId,
    actorId: actor.userId,
    action: 'user.created',
    targetType: 'User',
    targetId: user._id.toString(),
    metadata: { role: input.role },
  });

  return user.toJSON();
}

export async function updateUser(
  actor: AuthUser,
  id: string,
  input: { name?: string; role?: RoleName; isActive?: boolean },
) {
  const existing = await User.findOne({ _id: id, companyId: actor.companyId });
  if (!existing) throw ApiError.notFound('User not found');

  const isSelf = existing._id.toString() === actor.userId;

  // The owner's role is immutable — enforced here too, not just in the
  // request validation schema, since this is the actual write path.
  if (input.role !== undefined && existing.role === 'OWNER') {
    throw ApiError.badRequest("Cannot change the company owner's role");
  }

  if (!isSelf && !canManageUserWithRole(actor.role, existing.role)) {
    throw ApiError.forbidden('You cannot modify this user');
  }

  if (input.role !== undefined) {
    if (isSelf) {
      throw ApiError.badRequest('You cannot change your own role');
    }
    if (!canManageUserWithRole(actor.role, input.role)) {
      throw ApiError.forbidden(`You cannot assign the ${input.role} role`);
    }
  }

  if (input.isActive === false && (isSelf || existing.role === 'OWNER')) {
    throw ApiError.badRequest('This account cannot be deactivated');
  }

  const changes: Record<string, unknown> = {};

  if (input.name !== undefined) existing.name = input.name;

  if (input.role !== undefined && input.role !== existing.role) {
    changes.role = { from: existing.role, to: input.role };
    existing.role = input.role;
  }

  if (input.isActive !== undefined && input.isActive !== existing.isActive) {
    changes.isActive = input.isActive;
    existing.isActive = input.isActive;
  }

  await existing.save();

  if (changes.isActive === false) {
    // Suspended users lose every session immediately.
    await RefreshToken.updateMany(
      { userId: existing._id, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  if (Object.keys(changes).length > 0) {
    await audit({
      companyId: actor.companyId,
      actorId: actor.userId,
      action: 'user.updated',
      targetType: 'User',
      targetId: existing._id.toString(),
      metadata: changes,
    });
  }

  return existing.toJSON();
}

export async function deleteUser(actor: AuthUser, id: string) {
  const existing = await User.findOne({ _id: id, companyId: actor.companyId });
  if (!existing) throw ApiError.notFound('User not found');
  if (existing.role === 'OWNER') {
    throw ApiError.badRequest('Cannot delete the company owner');
  }
  if (existing._id.toString() === actor.userId) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  if (!canManageUserWithRole(actor.role, existing.role)) {
    throw ApiError.forbidden('You cannot delete this user');
  }

  await existing.deleteOne();
  await RefreshToken.deleteMany({ userId: existing._id });
  await removeUserFromTeams(actor.companyId, id);

  await audit({
    companyId: actor.companyId,
    actorId: actor.userId,
    action: 'user.deleted',
    targetType: 'User',
    targetId: id,
    metadata: { role: existing.role, email: existing.email },
  });
}
