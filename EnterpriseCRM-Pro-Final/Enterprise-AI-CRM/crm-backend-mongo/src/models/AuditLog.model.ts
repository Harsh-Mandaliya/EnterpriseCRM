import { Schema, model, Types } from 'mongoose';
import { applyJsonShape } from '@/models/shared';

/**
 * Append-only record of security-sensitive actions: role
 * changes, user deactivation, branding changes, password
 * resets. Never store secrets or tokens in `metadata`.
 */
export interface AuditLogDoc {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  actorId: Types.ObjectId | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true, maxlength: 64 },
    targetType: { type: String, required: true, maxlength: 64 },
    targetId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ companyId: 1, createdAt: -1 });

applyJsonShape(auditLogSchema);

export const AuditLog = model<AuditLogDoc>('AuditLog', auditLogSchema);
