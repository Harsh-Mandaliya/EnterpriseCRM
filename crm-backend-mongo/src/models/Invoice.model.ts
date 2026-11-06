import { Schema, model, Types } from 'mongoose';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceLineItem {
  productId?: Types.ObjectId | null;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceDoc {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  invoiceNumber: string;
  customerId: Types.ObjectId;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  notes?: string;
  createdById?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<InvoiceLineItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const invoiceSchema = new Schema<InvoiceDoc>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    invoiceNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    lineItems: { type: [lineItemSchema], default: [] },
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    issueDate: { type: Date, required: true, default: () => new Date() },
    dueDate: { type: Date, required: true },
    notes: { type: String },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// An invoice number only needs to be unique within its own company, not
// globally — two different companies can both have an "INV-0001".
invoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });

const transform = (_doc: unknown, ret: Record<string, any>) => {
  ret.id = ret._id.toString();
  delete ret._id;
  return ret;
};
invoiceSchema.set('toJSON', { virtuals: true, versionKey: false, transform });
invoiceSchema.set('toObject', { virtuals: true, versionKey: false, transform });

export const Invoice = model<InvoiceDoc>('Invoice', invoiceSchema);
