import { Schema, model, Types } from 'mongoose';

export interface ProductDoc {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  sku?: string;
  category?: string;
  description?: string;
  price: number;
  stockQty: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDoc>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true },
    sku: { type: String },
    category: { type: String, index: true },
    description: { type: String },
    price: { type: Number, required: true, default: 0 },
    stockQty: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const transform = (_doc: unknown, ret: Record<string, any>) => {
  ret.id = ret._id.toString();
  delete ret._id;
  return ret;
};
productSchema.set('toJSON', { virtuals: true, versionKey: false, transform });
productSchema.set('toObject', { virtuals: true, versionKey: false, transform });

export const Product = model<ProductDoc>('Product', productSchema);
