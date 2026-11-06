import { AuditLog } from '@/models';
import { logger } from '@/utils/logger';

/**
 * Records a security-sensitive action. Failures are logged but
 * never break the request that triggered them.
 */
export async function audit(entry: {
  companyId: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await AuditLog.create({
      ...entry,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (err) {
    logger.error('Failed to write audit log', {
      action: entry.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
