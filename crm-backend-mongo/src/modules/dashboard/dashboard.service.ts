import { Types } from 'mongoose';

import {
  User,
  Lead,
  Opportunity,
  Activity,
  Customer,
} from '@/models';

/* ============================================================
   OWNER / ADMIN DASHBOARD
   Company-wide dashboard
============================================================ */

export async function getSummary(companyId: string) {
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  const companyObjectId = new Types.ObjectId(companyId);

  const [
    openLeadsCount,
    openOpportunitiesAgg,
    pendingTasks,
    todaysActivities,
    topCustomersRaw,
    recentActivitiesDocs,
    leadFunnelRaw,
    wonThisMonthAgg,
    wonTodayAgg,
  ] = await Promise.all([
    /* ========================================================
       OPEN LEADS
    ======================================================== */

    Lead.countDocuments({
      companyId,
      status: {
        $in: ['NEW', 'CONTACTED', 'QUALIFIED'],
      },
    }),

    /* ========================================================
       OPEN OPPORTUNITIES
    ======================================================== */

    Opportunity.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          stage: {
            $nin: ['WON', 'LOST'],
          },
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
          total: {
            $sum: '$amount',
          },
        },
      },
    ]),

    /* ========================================================
       PENDING TASKS
    ======================================================== */

    Activity.countDocuments({
      companyId,
      type: 'TASK',
      completedAt: null,
    }),

    /* ========================================================
       TODAY'S ACTIVITIES
    ======================================================== */

    Activity.countDocuments({
      companyId,
      createdAt: {
        $gte: startOfToday,
      },
    }),

    /* ========================================================
       TOP CUSTOMERS
    ======================================================== */

    Opportunity.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          stage: 'WON',
          customerId: {
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: '$customerId',
          total: {
            $sum: '$amount',
          },
        },
      },
      {
        $sort: {
          total: -1,
        },
      },
      {
        $limit: 5,
      },
    ]),

    /* ========================================================
       RECENT ACTIVITIES
    ======================================================== */

    Activity.find({
      companyId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .populate({
        path: 'createdById',
        select: 'name',
      }),

    /* ========================================================
       LEAD FUNNEL
    ======================================================== */

    Lead.aggregate([
      {
        $match: {
          companyId: companyObjectId,
        },
      },
      {
        $group: {
          _id: '$status',
          count: {
            $sum: 1,
          },
        },
      },
    ]),

    /* ========================================================
       WON THIS MONTH
    ======================================================== */

    Opportunity.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          stage: 'WON',
          updatedAt: {
            $gte: startOfMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
          total: {
            $sum: '$amount',
          },
        },
      },
    ]),

    /* ========================================================
       WON TODAY
    ======================================================== */

    Opportunity.aggregate([
      {
        $match: {
          companyId: companyObjectId,
          stage: 'WON',
          updatedAt: {
            $gte: startOfToday,
          },
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
          total: {
            $sum: '$amount',
          },
        },
      },
    ]),
  ]);

  /* ============================================================
     CUSTOMER NAMES
  ============================================================ */

  const customerIds = topCustomersRaw
    .map(customer => customer._id)
    .filter(Boolean);

  const customers = await Customer.find({
    _id: {
      $in: customerIds,
    },
  }).select('name');

  const customerNameById = new Map(
    customers.map(customer => [
      customer._id.toString(),
      customer.name,
    ]),
  );

  /* ============================================================
     DEFAULT VALUES
  ============================================================ */

  const openOpportunities =
    openOpportunitiesAgg[0] ?? {
      count: 0,
      total: 0,
    };

  const wonThisMonth =
    wonThisMonthAgg[0] ?? {
      count: 0,
      total: 0,
    };

  const wonToday =
    wonTodayAgg[0] ?? {
      count: 0,
      total: 0,
    };

  /* ============================================================
     RESPONSE
  ============================================================ */

  return {
    todaysSales: {
      total: Number(wonToday.total ?? 0),
      orderCount: wonToday.count ?? 0,
    },

    monthlySales: {
      total: Number(wonThisMonth.total ?? 0),
      orderCount: wonThisMonth.count ?? 0,
    },

    pendingTasks,

    todaysVisits: todaysActivities,

    openLeads: openLeadsCount,

    pipeline: {
      openOpportunityCount:
        openOpportunities.count ?? 0,

      expectedRevenue:
        Number(openOpportunities.total ?? 0),
    },

    topCustomers: topCustomersRaw.map(customer => ({
      customerId: customer._id.toString(),

      customerName:
        customerNameById.get(
          customer._id.toString(),
        ) ?? 'Unknown',

      totalRevenue:
        Number(customer.total ?? 0),
    })),

    recentActivities: recentActivitiesDocs.map(
      (activity: any) => ({
        id: activity._id.toString(),

        type: activity.type,

        summary: activity.summary,

        createdAt: activity.createdAt,

        createdBy:
          activity.createdById &&
          activity.createdById.name
            ? {
                id: activity.createdById._id.toString(),
                name: activity.createdById.name,
              }
            : null,
      }),
    ),

    leadFunnel: leadFunnelRaw.map(lead => ({
      status: lead._id,
      count: lead.count,
    })),
  };
}


/* ============================================================
   MANAGER DASHBOARD
============================================================ */

export async function getManagerSummary(
  companyId: string,
  managerId: string,
  /**
   * Team members (plus the manager) whose records count. Defaults to
   * the manager alone when they lead no team.
   */
  teamUserIds: Types.ObjectId[] = [new Types.ObjectId(managerId)],
) {
  const companyObjectId =
    new Types.ObjectId(companyId);


  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  /* ==========================================================
     MANAGER METRICS
  ========================================================== */

  const [
    teamLeads,
    openDealsAgg,
    pendingTasks,
    todaysActivities,
    wonRevenueAgg,
    wonDeals,
    wonThisMonthAgg,
  ] = await Promise.all([
    /* ========================================================
       OPEN LEADS ASSIGNED TO MANAGER
    ======================================================== */

    Lead.countDocuments({
      companyId,
      assignedToId: { $in: teamUserIds },
      status: {
        $in: [
          'NEW',
          'CONTACTED',
          'QUALIFIED',
        ],
      },
    }),

    /* ========================================================
       OPEN DEALS OWNED BY MANAGER
    ======================================================== */

    Opportunity.aggregate([
      {
        $match: {
          companyId: companyObjectId,

          ownerId: { $in: teamUserIds },

          stage: {
            $nin: [
              'WON',
              'LOST',
            ],
          },
        },
      },
      {
        $group: {
          _id: null,

          count: {
            $sum: 1,
          },

          total: {
            $sum: '$amount',
          },
        },
      },
    ]),

    /* ========================================================
       PENDING TASKS
    ======================================================== */

    Activity.countDocuments({
      companyId,

      assignedToId: { $in: teamUserIds },

      type: 'TASK',

      completedAt: null,
    }),

    /* ========================================================
       TODAY'S ACTIVITIES
    ======================================================== */

    Activity.countDocuments({
      companyId,

      assignedToId: { $in: teamUserIds },

      createdAt: {
        $gte: startOfToday,
      },
    }),

    /* ========================================================
       ALL-TIME WON REVENUE
    ======================================================== */

    Opportunity.aggregate([
      {
        $match: {
          companyId: companyObjectId,

          ownerId: { $in: teamUserIds },

          stage: 'WON',
        },
      },
      {
        $group: {
          _id: null,

          total: {
            $sum: '$amount',
          },
        },
      },
    ]),

    /* ========================================================
       ALL-TIME WON DEALS
    ======================================================== */

    Opportunity.countDocuments({
      companyId: companyObjectId,

      ownerId: { $in: teamUserIds },

      stage: 'WON',
    }),

    /* ========================================================
       WON REVENUE THIS MONTH
    ======================================================== */

    Opportunity.aggregate([
      {
        $match: {
          companyId: companyObjectId,

          ownerId: { $in: teamUserIds },

          stage: 'WON',

          updatedAt: {
            $gte: startOfMonth,
          },
        },
      },
      {
        $group: {
          _id: null,

          total: {
            $sum: '$amount',
          },

          count: {
            $sum: 1,
          },
        },
      },
    ]),
  ]);

  /* ============================================================
     DEFAULT VALUES
  ============================================================ */

  const openDeals =
    openDealsAgg[0] ?? {
      count: 0,
      total: 0,
    };

  const wonRevenue =
    wonRevenueAgg[0] ?? {
      total: 0,
    };

  const wonThisMonth =
    wonThisMonthAgg[0] ?? {
      total: 0,
      count: 0,
    };

  /* ============================================================
     PERFORMANCE

     There is currently no manager-target field in the
     provided User/model structure.

     Therefore we don't invent a business target.

     We return safe default values so the frontend never
     crashes while the target system is not implemented.
  ============================================================ */

  const targetRevenue = 0;

  const achievedRevenue =
    Number(wonThisMonth.total ?? 0);

  const achievementPercentage =
    targetRevenue > 0
      ? Number(
          (
            (achievedRevenue / targetRevenue) *
            100
          ).toFixed(2),
        )
      : 0;

  /* ============================================================
     RESPONSE
  ============================================================ */

  return {
    /* ----------------------------------------------------------
       PRIMARY MANAGER METRICS
    ---------------------------------------------------------- */

    teamLeads:
      Number(teamLeads ?? 0),

    /** Number of people the figures cover (manager included). */
    teamSize:
      teamUserIds.length,

    openDeals:
      Number(openDeals.count ?? 0),

    pipelineRevenue:
      Number(openDeals.total ?? 0),

    pendingTasks:
      Number(pendingTasks ?? 0),

    todaysActivities:
      Number(todaysActivities ?? 0),

    totalWonRevenue:
      Number(wonRevenue.total ?? 0),

    wonDeals:
      Number(wonDeals ?? 0),

    /* ----------------------------------------------------------
       PERFORMANCE OBJECT

       This fixes:

       Cannot read property
       'achievementPercentage'
       of undefined
    ---------------------------------------------------------- */

    performance: {
      targetRevenue,

      achievedRevenue,

      achievementPercentage,
    },

    /* ----------------------------------------------------------
       TOP-LEVEL COMPATIBILITY

       If your existing ManagerDashboardScreen currently
       accesses:

       data.achievementPercentage

       instead of:

       data.performance.achievementPercentage

       it will also work.
    ---------------------------------------------------------- */

    achievementPercentage,

    targetRevenue,

    achievedRevenue,

    /* ----------------------------------------------------------
       MONTHLY PERFORMANCE
    ---------------------------------------------------------- */

    monthlyWonDeals:
      Number(wonThisMonth.count ?? 0),

    monthlyWonRevenue:
      Number(wonThisMonth.total ?? 0),
  };
}

/* ============================================================
   SALES DASHBOARD
============================================================ */

export async function getSalesSummary(
  companyId: string,
  salesUserId: string,
) {
  /*
   * Sales dashboard is PERSONAL.
   *
   * Only records belonging to the logged-in Sales user
   * should be counted.
   */

  const startOfToday = new Date();

  startOfToday.setHours(
    0,
    0,
    0,
    0,
  );

  const salesUserObjectId =
    new Types.ObjectId(salesUserId);

  /* ==========================================================
     MY LEADS
  ========================================================== */

  const myLeads = await Lead.countDocuments({
    companyId,
    assignedToId: salesUserObjectId,
    status: {
      $in: [
        'NEW',
        'CONTACTED',
        'QUALIFIED',
      ],
    },
  });

  /* ==========================================================
     MY OPEN DEALS + PIPELINE
  ========================================================== */

  const openDealsAgg =
    await Opportunity.aggregate([
      {
        $match: {
          companyId:
            new Types.ObjectId(companyId),

          ownerId: salesUserObjectId,

          stage: {
            $nin: [
              'WON',
              'LOST',
            ],
          },
        },
      },

      {
        $group: {
          _id: null,

          count: {
            $sum: 1,
          },

          total: {
            $sum: '$amount',
          },
        },
      },
    ]);

  /* ==========================================================
     MY PENDING TASKS
  ========================================================== */

  const pendingTasks =
    await Activity.countDocuments({
      companyId,

      assignedToId:
        salesUserObjectId,

      type: 'TASK',

      completedAt: null,
    });

  /* ==========================================================
     MY TODAY'S ACTIVITIES
  ========================================================== */

  const todaysActivities =
    await Activity.countDocuments({
      companyId,

      assignedToId:
        salesUserObjectId,

      createdAt: {
        $gte: startOfToday,
      },
    });

  /* ==========================================================
     MY WON DEALS
  ========================================================== */

  const wonDealsAgg =
    await Opportunity.aggregate([
      {
        $match: {
          companyId:
            new Types.ObjectId(companyId),

          ownerId: salesUserObjectId,

          stage: 'WON',
        },
      },

      {
        $group: {
          _id: null,

          count: {
            $sum: 1,
          },

          total: {
            $sum: '$amount',
          },
        },
      },
    ]);

  /* ==========================================================
     SAFE DEFAULTS
  ========================================================== */

  const openDeals =
    openDealsAgg[0] ?? {
      count: 0,
      total: 0,
    };

  const wonDeals =
    wonDealsAgg[0] ?? {
      count: 0,
      total: 0,
    };

  /* ==========================================================
     RESPONSE
  ========================================================== */

  return {
    myLeads: Number(
      myLeads ?? 0,
    ),

    openDeals: Number(
      openDeals.count ?? 0,
    ),

    pipelineRevenue: Number(
      openDeals.total ?? 0,
    ),

    pendingTasks: Number(
      pendingTasks ?? 0,
    ),

    todaysActivities: Number(
      todaysActivities ?? 0,
    ),

    totalWonRevenue: Number(
      wonDeals.total ?? 0,
    ),

    wonDeals: Number(
      wonDeals.count ?? 0,
    ),
  };
}


/* ============================================================
   EMPLOYEE DASHBOARD
============================================================ */

export async function getEmployeeSummary(
  companyId: string,
  userId: string,
) {

  /* ----------------------------------------------------------
     TODAY
  ---------------------------------------------------------- */

  const now =
    new Date();

  const startOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

  const startOfTomorrow =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );


  /* ----------------------------------------------------------
     EMPLOYEE DATA
     
     IMPORTANT:
     Everything is filtered by assignedToId.
     
     Employee does NOT receive company-wide
     dashboard information.
  ---------------------------------------------------------- */

  const [
    myTasks,
    todaysActivities,
    todaysMeetings,
    overdueTasks,
    completedTasks,
    pendingTasks,
    upcomingActivities,
  ] = await Promise.all([


    /* ========================================================
       MY ACTIVE TASKS
    ======================================================== */

    Activity.countDocuments({

      companyId,

      assignedToId:
        userId,

      type:
        'TASK',

      completedAt:
        null,

    }),


    /* ========================================================
       TODAY'S ACTIVITIES
    ======================================================== */

    Activity.countDocuments({

      companyId,

      assignedToId:
        userId,

      createdAt: {
        $gte:
          startOfToday,

        $lt:
          startOfTomorrow,
      },

    }),


    /* ========================================================
       TODAY'S MEETINGS
    ======================================================== */

    Activity.countDocuments({

      companyId,

      assignedToId:
        userId,

      type:
        'MEETING',

      createdAt: {
        $gte:
          startOfToday,

        $lt:
          startOfTomorrow,
      },

    }),


    /* ========================================================
       OVERDUE TASKS
    ======================================================== */

    Activity.countDocuments({

      companyId,

      assignedToId:
        userId,

      type:
        'TASK',

      completedAt:
        null,

      dueAt: {
        $lt:
          now,
      },

    }),


    /* ========================================================
       COMPLETED TASKS
    ======================================================== */

    Activity.countDocuments({

      companyId,

      assignedToId:
        userId,

      type:
        'TASK',

      completedAt: {
        $ne:
          null,
      },

    }),


    /* ========================================================
       PENDING TASKS
    ======================================================== */

    Activity.countDocuments({

      companyId,

      assignedToId:
        userId,

      type:
        'TASK',

      completedAt:
        null,

    }),


    /* ========================================================
       UPCOMING ACTIVITIES
    ======================================================== */

    Activity.countDocuments({

      companyId,

      assignedToId:
        userId,

      createdAt: {
        $gte:
          startOfTomorrow,
      },

    }),

  ]);


  /* ==========================================================
     RESPONSE
  ========================================================== */

  return {

    myTasks:
      Number(myTasks ?? 0),

    todaysActivities:
      Number(
        todaysActivities ?? 0,
      ),

    todaysMeetings:
      Number(
        todaysMeetings ?? 0,
      ),

    overdueTasks:
      Number(
        overdueTasks ?? 0,
      ),

    completedTasks:
      Number(
        completedTasks ?? 0,
      ),

    pendingTasks:
      Number(
        pendingTasks ?? 0,
      ),

    upcomingActivities:
      Number(
        upcomingActivities ?? 0,
      ),

  };
}

/* ============================================================
   ADMIN DASHBOARD
============================================================ */

export async function getAdminSummary(
  companyId: string,
  userId: string,
) {
  // Aggregations don't cast strings to ObjectId; a string companyId
  // in $match silently matches nothing (open deals were always 0).
  const companyObjectId = new Types.ObjectId(companyId);

  const [
    totalUsers,
    activeUsers,
    salesUsers,
    managerUsers,
    employeeUsers,
    openLeads,
    openDealsAgg,
    pendingTasks,
  ] = await Promise.all([


    /* ========================================================
       TOTAL USERS
    ======================================================== */

    User.countDocuments({
      companyId,
    }),


    /* ========================================================
       ACTIVE USERS
    ======================================================== */

    User.countDocuments({
      companyId,
      isActive: true,
    }),


    /* ========================================================
       SALES USERS
    ======================================================== */

    User.countDocuments({
      companyId,
      role: 'SALES',
      isActive: true,
    }),


    /* ========================================================
       MANAGERS
    ======================================================== */

    User.countDocuments({
      companyId,
      role: 'MANAGER',
      isActive: true,
    }),


    /* ========================================================
       EMPLOYEES
    ======================================================== */

    User.countDocuments({
      companyId,
      role: 'EMPLOYEE',
      isActive: true,
    }),


    /* ========================================================
       OPEN LEADS
    ======================================================== */

    // Same definition as the owner dashboard (lead statuses have no
    // WON/CLOSED; CONVERTED and UNQUALIFIED are not open).
    Lead.countDocuments({
      companyId,
      status: {
        $in: ['NEW', 'CONTACTED', 'QUALIFIED'],
      },
    }),


    /* ========================================================
       OPEN DEALS
    ======================================================== */

    Opportunity.aggregate([

      {
        $match: {

          companyId: companyObjectId,

          stage: {
            $nin: [
              'WON',
              'LOST',
            ],
          },

        },
      },

      {
        $group: {

          _id: null,

          count: {
            $sum: 1,
          },

          total: {
            $sum: '$amount',
          },

        },
      },

    ]),


    /* ========================================================
       PENDING TASKS
    ======================================================== */

    Activity.countDocuments({

      companyId,

      type: 'TASK',

      completedAt: null,

    }),

  ]);


  const openDeals =
    openDealsAgg[0] ?? {
      count: 0,
      total: 0,
    };


  return {

    totalUsers:
      Number(
        totalUsers ?? 0,
      ),

    activeUsers:
      Number(
        activeUsers ?? 0,
      ),

    salesUsers:
      Number(
        salesUsers ?? 0,
      ),

    managerUsers:
      Number(
        managerUsers ?? 0,
      ),

    employeeUsers:
      Number(
        employeeUsers ?? 0,
      ),

    openLeads:
      Number(
        openLeads ?? 0,
      ),

    openDeals:
      Number(
        openDeals.count ?? 0,
      ),

    pipelineRevenue:
      Number(
        openDeals.total ?? 0,
      ),

    pendingTasks:
      Number(
        pendingTasks ?? 0,
      ),

  };

}