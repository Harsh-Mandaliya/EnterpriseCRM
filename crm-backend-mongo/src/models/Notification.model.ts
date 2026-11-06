import { Schema, model, Types } from 'mongoose';

export type NotificationType =
  | 'TASK'
  | 'LEAD'
  | 'DEAL'
  | 'INVOICE'
  | 'PAYMENT'
  | 'MEETING'
  | 'SYSTEM';

export interface NotificationDoc {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  userId: Types.ObjectId; // recipient
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['TASK', 'LEAD', 'DEAL', 'INVOICE', 'PAYMENT', 'MEETING', 'SYSTEM'],
      default: 'SYSTEM',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    relatedId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

const transform = (_doc: unknown, ret: Record<string, any>) => {
  ret.id = ret._id.toString();
  delete ret._id;
  return ret;
};
notificationSchema.set('toJSON', { virtuals: true, versionKey: false, transform });
notificationSchema.set('toObject', { virtuals: true, versionKey: false, transform });

export const Notification = model<NotificationDoc>('Notification', notificationSchema);
