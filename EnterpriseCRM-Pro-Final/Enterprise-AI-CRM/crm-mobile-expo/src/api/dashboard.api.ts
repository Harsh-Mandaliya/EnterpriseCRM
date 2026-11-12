import { apiClient } from '@/api/client';

import type { DashboardSummary } from '@/types';

/* ============================================================
   OWNER DASHBOARD
============================================================ */

// Single source of truth lives in '@/types' so screens and the API agree.
export type { DashboardSummary };

/* ============================================================
   MANAGER DASHBOARD
============================================================ */

export interface ManagerDashboardSummary {
  teamLeads: number;

  openDeals: number;

  pipelineRevenue: number;

  pendingTasks: number;

  todaysActivities: number;

  totalWonRevenue: number;

  wonDeals: number;
}

/* ============================================================
   SALES DASHBOARD
============================================================ */

export interface SalesDashboardSummary {
  myLeads: number;

  openDeals: number;

  pipelineRevenue: number;

  pendingTasks: number;

  todaysActivities: number;

  totalWonRevenue: number;

  wonDeals: number;
}

/* ============================================================
   OWNER DASHBOARD API
   GET /dashboard/summary
============================================================ */

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } =
    await apiClient.get<DashboardSummary>(
      '/dashboard/summary',
    );

  return data;
}

/* ============================================================
   MANAGER DASHBOARD API
   GET /dashboard/manager-summary
============================================================ */

export async function getManagerDashboardSummary(): Promise<ManagerDashboardSummary> {
  const { data } =
    await apiClient.get<ManagerDashboardSummary>(
      '/dashboard/manager-summary',
    );

  return data;
}

/* ============================================================
   SALES DASHBOARD API
   GET /dashboard/sales-summary
============================================================ */

export async function getSalesDashboardSummary(): Promise<SalesDashboardSummary> {
  const { data } =
    await apiClient.get<SalesDashboardSummary>(
      '/dashboard/sales-summary',
    );

  return data;
}

/* ============================================================
   ADMIN DASHBOARD
============================================================ */

export interface AdminDashboardSummary {
  totalUsers: number;

  activeUsers: number;

  salesUsers: number;

  managerUsers: number;

  employeeUsers: number;

  openLeads: number;

  openDeals: number;

  pipelineRevenue: number;

  pendingTasks: number;
}

/* ============================================================
   ADMIN DASHBOARD API
   GET /dashboard/admin-summary
============================================================ */

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const { data } =
    await apiClient.get<AdminDashboardSummary>(
      '/dashboard/admin-summary',
    );

  return data;
}
