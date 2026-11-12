import { Activity } from '@/models';

import { ApiError } from '@/utils/apiError';

import { notify } from '@/modules/notifications/notifications.service';

/* ============================================================
   POPULATE CONFIGURATION
   ============================================================ */

const POPULATE_CREATED_BY = {
  path: 'createdById',
  select: 'name role',
};

const POPULATE_COMPLETED_BY = {
  path: 'completedById',
  select: 'name role',
};

/* ============================================================
   ACTIVITY → API JSON
   ============================================================ */

function toActivityJson(doc: any) {
  const json = doc.toJSON();

  /* ----------------------------------------------------------
     CREATED BY
     ---------------------------------------------------------- */

  const createdBy =
    doc.createdById &&
    doc.createdById.name
      ? {
          id: doc.createdById._id.toString(),
          name: doc.createdById.name,
        }
      : null;

  /* ----------------------------------------------------------
     COMPLETED BY
     ---------------------------------------------------------- */

  const completedBy =
    doc.completedById &&
    doc.completedById.name
      ? {
          id: doc.completedById._id.toString(),
          name: doc.completedById.name,
          role: doc.completedById.role,
        }
      : null;

  /* ----------------------------------------------------------
     RESPONSE
     ---------------------------------------------------------- */

  return {
    ...json,

    createdById:
      createdBy?.id ??
      json.createdById ??
      null,

    createdBy,

    completedById:
      completedBy?.id ??
      json.completedById ??
      null,

    completedBy,

    completedAt:
      json.completedAt ??
      null,
  };
}

/* ============================================================
   LIST ACTIVITIES
   ============================================================ */

export async function listActivities(
  companyId: string,
  params: {
    customerId?: string;
    leadId?: string;
    opportunityId?: string;
  },
  scope: Record<string, unknown> = {},
) {
  const filter: Record<string, unknown> = {
    ...scope,
    companyId,
  };

  if (params.customerId) {
    filter.customerId = params.customerId;
  }

  if (params.leadId) {
    filter.leadId = params.leadId;
  }

  if (params.opportunityId) {
    filter.opportunityId = params.opportunityId;
  }

  const activities =
    await Activity.find(filter)
      .populate(POPULATE_CREATED_BY)
      .populate(POPULATE_COMPLETED_BY)
      .sort({
        createdAt: -1,
      });

  return activities.map(
    toActivityJson,
  );
}

/* ============================================================
   CREATE ACTIVITY
   ============================================================ */

export async function createActivity(
  companyId: string,
  createdById: string,
  input: Record<string, unknown>,
) {
  /*
   * Never allow the client to decide:
   *
   * completedById
   * completedAt
   *
   * New activities always start as PENDING.
   */

  const {
    completedById: _completedById,
    completedAt: _completedAt,
    status: _status,
    ...safeInput
  } = input;

  const activity =
    await Activity.create({
      ...safeInput,

      companyId,

      createdById,

      // A task created without an assignee is the creator's own task
      // (reps' forms don't send one); dashboards count by assignee.
      assignedToId: safeInput.assignedToId ?? createdById,

      status: 'PENDING',

      completedById: null,

      completedAt: null,
    });

  await activity.populate(
    POPULATE_CREATED_BY,
  );

  const assignedToId =
    safeInput.assignedToId as
      | string
      | undefined;

  if (
    assignedToId &&
    assignedToId !== createdById
  ) {
    await notify(
      companyId,
      assignedToId,
      {
        type: 'TASK',

        title:
          'New task assigned to you',

        message:
          activity.summary,

        relatedId:
          activity._id.toString(),
      },
    );
  }

  return toActivityJson(activity);
}

/* ============================================================
   COMPLETE ACTIVITY
   ============================================================ */

export async function completeActivity(
  companyId: string,
  id: string,
  completedById: string,
  scope: Record<string, unknown> = {},
) {
  /* ----------------------------------------------------------
     FIND ACTIVITY
     ---------------------------------------------------------- */

  const activity =
    await Activity.findOne({
      ...scope,
      _id: id,
      companyId,
    });

  if (!activity) {
    throw ApiError.notFound(
      'Activity not found',
    );
  }

  /* ----------------------------------------------------------
     ALREADY COMPLETED
     ---------------------------------------------------------- */

  if (
    activity.status ===
    'COMPLETED'
  ) {
    throw ApiError.badRequest(
      'Activity is already completed',
    );
  }

  /* ----------------------------------------------------------
     CANCELLED ACTIVITY
     ---------------------------------------------------------- */

  if (
    activity.status ===
    'CANCELLED'
  ) {
    throw ApiError.badRequest(
      'Cancelled activity cannot be completed',
    );
  }

  /* ----------------------------------------------------------
     COMPLETE
     ----------------------------------------------------------

     IMPORTANT:

     completedById comes from the authenticated JWT user.

     completedAt comes from the backend server.

     The frontend cannot control either value.
     ---------------------------------------------------------- */

  activity.status =
    'COMPLETED';

  activity.completedById =
    completedById as any;

  activity.completedAt =
    new Date();

  await activity.save();

  /* ----------------------------------------------------------
     POPULATE RESPONSE
     ---------------------------------------------------------- */

  await activity.populate(
    POPULATE_CREATED_BY,
  );

  await activity.populate(
    POPULATE_COMPLETED_BY,
  );

  return toActivityJson(
    activity,
  );
}

/* ============================================================
   UPDATE ACTIVITY
   ------------------------------------------------------------
   This function is for editing activity information.

   Completion must happen through completeActivity().
   ============================================================ */

export async function updateActivity(
  companyId: string,
  id: string,
  input: Record<string, unknown>,
) {
  const existing =
    await Activity.findOne({
      _id: id,
      companyId,
    });

  if (!existing) {
    throw ApiError.notFound(
      'Activity not found',
    );
  }

  /*
   * Only allow editable fields.
   *
   * Do NOT allow:
   *   status
   *   completedAt
   *   completedById
   *   companyId
   *   createdById
   *
   * These fields are controlled by the backend.
   */

  const allowedFields = [
    'type',
    'summary',
    'notes',
    'dueAt',
    'customerId',
    'leadId',
    'opportunityId',
    'assignedToId',
  ];

  for (
    const field of allowedFields
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        field,
      )
    ) {
      (existing as any)[field] =
        input[field];
    }
  }

  await existing.save();

  await existing.populate(
    POPULATE_CREATED_BY,
  );

  await existing.populate(
    POPULATE_COMPLETED_BY,
  );

  return toActivityJson(
    existing,
  );
}

/* ============================================================
   DELETE ACTIVITY
   ============================================================ */

export async function deleteActivity(
  companyId: string,
  id: string,
) {
  const existing =
    await Activity.findOneAndDelete({
      _id: id,
      companyId,
    });

  if (!existing) {
    throw ApiError.notFound(
      'Activity not found',
    );
  }
}