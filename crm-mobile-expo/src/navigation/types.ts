import type { Customer, Lead, Opportunity, Product } from '@/types';

/* ============================================================
   SHARED APP STACK PARAM LIST
   ------------------------------------------------------------
   Every role navigator (Owner, Admin, Manager, Sales, Employee)
   renders the same shared screens (CustomerDetail, LeadDetail,
   InvoiceForm, ...). Those screens read their params with one
   fixed contract, so every navigator must use the same param
   types. Each role simply registers the subset of routes it is
   allowed to reach.
============================================================ */

export type AppStackParamList = {
  /* Dashboards (one per role) */
  Dashboard: undefined;
  AdminDashboard: undefined;
  ManagerDashboard: undefined;
  SalesDashboard: undefined;
  EmployeeDashboard: undefined;

  /* Customers */
  CustomerList: undefined;
  CustomerDetail: {
    customerId: string;
    customerName: string;
  };
  CustomerForm:
    | {
        customer?: Customer;
      }
    | undefined;

  /* Leads */
  LeadList: undefined;
  LeadDetail: {
    leadId: string;
    leadName: string;
  };

  /* Deals */
  OpportunitiesBoard: undefined;

  /* Activities */
  Activities: undefined;

  /* Profile & settings */
  Profile: undefined;
  ThemeSettings: undefined;

  /* Team */
  UserManagement: undefined;
  UserList: undefined;
  Teams: undefined;

  /* Products */
  ProductList: undefined;

  /* Invoices */
  InvoiceList: undefined;
  /** Without a customer the form shows a customer picker. */
  InvoiceForm:
    | {
        customerId?: string;
        customerName?: string;
      }
    | undefined;

  /* Payments */
  PaymentList: undefined;

  /* Calendar */
  Calendar: undefined;

  /* Notifications */
  NotificationList: undefined;

  /* Reports */
  Reports: undefined;

  /* AI */
  AiCenter: undefined;

  /* Forms (v1.3) */
  LeadForm: { lead?: Lead } | undefined;
  DealForm: { deal?: Opportunity; customerId?: string; leadId?: string } | undefined;
  TaskForm: { leadId?: string; customerId?: string; opportunityId?: string } | undefined;
  ProductForm: { product?: Product } | undefined;
  PaymentForm: { invoiceId?: string } | undefined;
  EventForm: { date?: string } | undefined;

  /* Visual pipeline & analytics (v1.3) */
  Pipeline: undefined;
  Analytics: undefined;
};
