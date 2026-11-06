import { Schema, model, Types } from 'mongoose';
import { applyJsonShape } from '@/models/shared';

export type OpportunityStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export interface OpportunityDoc {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  leadId?: Types.ObjectId | null;
  customerId?: Types.ObjectId | null;
  title: string;
  amount: number;
  stage: OpportunityStage;
  closeDate?: Date | null;
  ownerId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const opportunitySchema = new Schema<OpportunityDoc>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    title: { type: String, required: true },
    amount: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'],
      default: 'PROSPECTING',
      index: true,
    },
    closeDate: { type: Date, default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

applyJsonShape(opportunitySchema);

export const Opportunity = model<OpportunityDoc>('Opportunity', opportunitySchema);
