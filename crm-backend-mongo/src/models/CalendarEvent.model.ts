import { Schema, model, Types } from 'mongoose';

export type EventType = 'MEETING' | 'CALL' | 'FOLLOW_UP' | 'DEADLINE' | 'OTHER';

export interface CalendarEventDoc {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  title: string;
  type: EventType;
  startAt: Date;
  endAt: Date;
  location?: string;
  notes?: string;
  customerId?: Types.ObjectId | null;
  leadId?: Types.ObjectId | null;
  opportunityId?: Types.ObjectId | null;
  attendeeIds: Types.ObjectId[];
  createdById?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const calendarEventSchema = new Schema<CalendarEventDoc>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['MEETING', 'CALL', 'FOLLOW_UP', 'DEADLINE', 'OTHER'],
      default: 'MEETING',
    },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    location: { type: String },
    notes: { type: String },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
    opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity', default: null },
    attendeeIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

const transform = (_doc: unknown, ret: Record<string, any>) => {
  ret.id = ret._id.toString();
  delete ret._id;
  return ret;
};
calendarEventSchema.set('toJSON', { virtuals: true, versionKey: false, transform });
calendarEventSchema.set('toObject', { virtuals: true, versionKey: false, transform });

export const CalendarEvent = model<CalendarEventDoc>('CalendarEvent', calendarEventSchema);
