import type { AuthUser } from '@/middlewares/auth.middleware';
import { audit } from '@/utils/audit';

/**
 * Business work log ("who did what"): stored in the audit log
 * collection with `work.*` actions so the team-activity report
 * and record timelines can show who created, moved, completed or
 * collected what. Never throws.
 */
export function track(
  user: AuthUser,
  action: string,
  targetType: string,
  target: { id?: unknown; label?: unknown } | null | undefined,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  return audit({
    companyId: user.companyId,
    actorId: user.userId,
    action: `work.${action}`,
    targetType,
    targetId: target?.id ? String(target.id) : null,
    metadata: { label: target?.label ? String(target.label) : null, ...metadata },
  });
}
