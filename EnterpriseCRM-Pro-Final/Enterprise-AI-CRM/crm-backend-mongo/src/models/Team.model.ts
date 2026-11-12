import { Schema, model, Types } from 'mongoose';
import { applyJsonShape } from '@/models/shared';

/**
 * A sales team inside a company. The manager sees records owned
 * by the team's members (see utils/scope.ts). A user may belong
 * to several teams; a manager may lead several teams.
 */
export interface TeamDoc {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  /** Optional territory / region label. */
  territory: string | null;
  managerId: Types.ObjectId | null;
  memberIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<TeamDoc>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    territory: { type: String, trim: true, maxlength: 80, default: null },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

teamSchema.index({ companyId: 1, name: 1 }, { unique: true });
teamSchema.index({ companyId: 1, managerId: 1 });
teamSchema.index({ companyId: 1, memberIds: 1 });

applyJsonShape(teamSchema);

export const Team = model<TeamDoc>('Team', teamSchema);
