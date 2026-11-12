import { apiClient } from '@/api/client';

/* ============================================================
   EMPLOYEE DASHBOARD SUMMARY
============================================================ */

export interface EmployeeDashboardSummary {
  myTasks: number;
  todaysActivities: number;
  todaysMeetings: number;
  overdueTasks: number;

  completedTasks: number;
  pendingTasks: number;

  upcomingActivities: number;
}


/* ============================================================
   GET EMPLOYEE DASHBOARD
============================================================ */

export async function getEmployeeDashboardSummary(): Promise<EmployeeDashboardSummary> {
  const { data } =
    await apiClient.get<EmployeeDashboardSummary>(
      '/dashboard/employee-summary',
    );

  return data;
}