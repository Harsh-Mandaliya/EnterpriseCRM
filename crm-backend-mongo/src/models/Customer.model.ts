import {
  Schema,
  model,
  Types,
} from 'mongoose';

import {
  applyJsonShape,
  normalizePhone,
} from '@/models/shared';

export interface CustomerDoc {
  _id: Types.ObjectId;

  companyId: Types.ObjectId;

  name: string;

  email?: string;

  phone?: string;

  gstin?: string;

  address?: string;

  notes?: string;

  /** Sales owner. SALES/EMPLOYEE see customers they own or that are shared with them. */
  ownerId?: Types.ObjectId | null;

  sharedWithIds: Types.ObjectId[];

  /** Last 10 digits of phone, for duplicate detection. */
  phoneDigits?: string | null;

  createdAt: Date;

  updatedAt: Date;
}

const customerSchema =
  new Schema<CustomerDoc>(
    {
      companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 254,
      },

      phone: {
        type: String,
        trim: true,
        maxlength: 30,
      },

      gstin: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 15,
      },

      address: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 2000,
      },

      ownerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },

      sharedWithIds: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],

      phoneDigits: {
        type: String,
        default: null,
      },
    },

    {
      timestamps: true,
    },
  );

/*
 * Tenant + creation-time index.
 *
 * The companyId index is critical because every
 * customer query is company scoped.
 */
customerSchema.index({
  companyId: 1,
  createdAt: -1,
});

/*
 * Text index for future text-search support.
 */
customerSchema.index({
  name: 'text',
  email: 'text',
  phone: 'text',
});

customerSchema.pre('validate', function (next) {
  this.phoneDigits = normalizePhone(this.phone);
  next();
});

customerSchema.index({ companyId: 1, ownerId: 1 });
customerSchema.index({ companyId: 1, sharedWithIds: 1 });
customerSchema.index({ companyId: 1, email: 1 });
customerSchema.index({ companyId: 1, phoneDigits: 1 });

applyJsonShape(customerSchema);

export const Customer =
  model<CustomerDoc>(
    'Customer',
    customerSchema,
  );