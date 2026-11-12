import { Schema, model, Types } from 'mongoose';
import { applyJsonShape, normalizePhone } from '@/models/shared';

export type LeadSource =
  | 'WEBSITE'
  | 'REFERRAL'
  | 'COLD_CALL'
  | 'SOCIAL_MEDIA'
  | 'EVENT'
  | 'OTHER';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'UNQUALIFIED'
  | 'CONVERTED'
  | 'LOST';

export interface LeadDoc {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  customerId?: Types.ObjectId | null;
  name: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  status: LeadStatus;
  score?: number | null;
  assignedToId?: Types.ObjectId | null;
  /** Last 10 digits of phone, for duplicate detection. */
  phoneDigits?: string | null;
  convertedAt?: Date | null;
  opportunityId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<LeadDoc>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    name: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 30 },
    phoneDigits: { type: String, default: null },
    source: {
      type: String,
      enum: ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'SOCIAL_MEDIA', 'EVENT', 'OTHER'],
      default: 'OTHER',
    },
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'],
      default: 'NEW',
      index: true,
    },
    score: { type: Number, default: null },
    assignedToId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    convertedAt: { type: Date, default: null },
    opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity', default: null },
  },
  { timestamps: true },
);

leadSchema.pre('validate', function (next) {
  this.phoneDigits = normalizePhone(this.phone);
  next();
});

leadSchema.index({ companyId: 1, assignedToId: 1 });
leadSchema.index({ companyId: 1, email: 1 });
leadSchema.index({ companyId: 1, phoneDigits: 1 });

applyJsonShape(leadSchema);

export const Lead = model<LeadDoc>('Lead', leadSchema);
