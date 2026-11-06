import { Schema, model, Types } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'UPI' | 'OTHER';

export interface PaymentDoc {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  customerId: Types.ObjectId;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  paidAt: Date;
  recordedById?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDoc>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'UPI', 'OTHER'],
      default: 'BANK_TRANSFER',
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'COMPLETED',
      index: true,
    },
    reference: { type: String },
    paidAt: { type: Date, required: true, default: () => new Date() },
    recordedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

const transform = (_doc: unknown, ret: Record<string, any>) => {
  ret.id = ret._id.toString();
  delete ret._id;
  return ret;
};
paymentSchema.set('toJSON', { virtuals: true, versionKey: false, transform });
paymentSchema.set('toObject', { virtuals: true, versionKey: false, transform });

export const Payment = model<PaymentDoc>('Payment', paymentSchema);
