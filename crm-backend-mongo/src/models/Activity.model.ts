import { Schema, model, Types } from 'mongoose';

import { applyJsonShape } from '@/models/shared';

/* ============================================================
   TYPES
   ============================================================ */

export type ActivityType =
  | 'CALL'
  | 'EMAIL'
  | 'MEETING'
  | 'TASK'
  | 'NOTE';

export type ActivityStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

/* ============================================================
   ACTIVITY DOCUMENT
   ============================================================ */

export interface ActivityDoc {
  _id: Types.ObjectId;

  companyId: Types.ObjectId;

  type: ActivityType;

  status: ActivityStatus;

  summary: string;

  notes?: string;

  dueAt?: Date | null;

  /* ----------------------------------------------------------
     COMPLETION
     ---------------------------------------------------------- */

  completedAt?: Date | null;

  /**
   * User who completed the activity.
   *
   * This is populated from the authenticated user on the
   * backend. The frontend must never provide this value.
   */
  completedById?: Types.ObjectId | null;

  /* ----------------------------------------------------------
     CRM RELATIONSHIPS
     ---------------------------------------------------------- */

  customerId?: Types.ObjectId | null;

  leadId?: Types.ObjectId | null;

  opportunityId?: Types.ObjectId | null;

  /* ----------------------------------------------------------
     ASSIGNMENT / CREATION
     ---------------------------------------------------------- */

  assignedToId?: Types.ObjectId | null;

  createdById?: Types.ObjectId | null;

  /* ----------------------------------------------------------
     TIMESTAMPS
     ---------------------------------------------------------- */

  createdAt: Date;

  updatedAt: Date;
}

/* ============================================================
   SCHEMA
   ============================================================ */

const activitySchema =
  new Schema<ActivityDoc>(
    {
      /* ------------------------------------------------------
         COMPANY
         ------------------------------------------------------ */

      companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
      },

      /* ------------------------------------------------------
         ACTIVITY TYPE
         ------------------------------------------------------ */

      type: {
        type: String,

        enum: [
          'CALL',
          'EMAIL',
          'MEETING',
          'TASK',
          'NOTE',
        ],

        default: 'TASK',
      },

      /* ------------------------------------------------------
         STATUS
         ------------------------------------------------------ */

      status: {
        type: String,

        enum: [
          'PENDING',
          'COMPLETED',
          'CANCELLED',
        ],

        default: 'PENDING',

        index: true,
      },

      /* ------------------------------------------------------
         BASIC INFORMATION
         ------------------------------------------------------ */

      summary: {
        type: String,

        required: true,

        trim: true,
      },

      notes: {
        type: String,

        default: null,
      },

      /* ------------------------------------------------------
         DUE DATE
         ------------------------------------------------------ */

      dueAt: {
        type: Date,

        default: null,
      },

      /* ------------------------------------------------------
         COMPLETION
         ------------------------------------------------------ */

      completedAt: {
        type: Date,

        default: null,
      },

      completedById: {
        type: Schema.Types.ObjectId,

        ref: 'User',

        default: null,

        index: true,
      },

      /* ------------------------------------------------------
         CRM RELATIONSHIPS
         ------------------------------------------------------ */

      customerId: {
        type: Schema.Types.ObjectId,

        ref: 'Customer',

        default: null,
      },

      leadId: {
        type: Schema.Types.ObjectId,

        ref: 'Lead',

        default: null,
      },

      opportunityId: {
        type: Schema.Types.ObjectId,

        ref: 'Opportunity',

        default: null,
      },

      /* ------------------------------------------------------
         ASSIGNMENT
         ------------------------------------------------------ */

      assignedToId: {
        type: Schema.Types.ObjectId,

        ref: 'User',

        default: null,
      },

      /* ------------------------------------------------------
         CREATED BY
         ------------------------------------------------------ */

      createdById: {
        type: Schema.Types.ObjectId,

        ref: 'User',

        default: null,
      },
    },

    {
      timestamps: true,
    },
  );

/* ============================================================
   JSON TRANSFORMATION
   ============================================================ */

applyJsonShape(activitySchema);

/* ============================================================
   MODEL
   ============================================================ */

export const Activity =
  model<ActivityDoc>(
    'Activity',
    activitySchema,
  );