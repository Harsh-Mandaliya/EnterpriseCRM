export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  userId: string;
  companyId: string;
  roleId: string;
  roleName: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/* ============================================================
   ROLES
   ============================================================ */

export type Role =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'SALES'
  | 'EMPLOYEE';

/* ============================================================
   AUTH / USER
   ============================================================ */

export interface Me {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string | null;
  companyId: string;
  createdAt: string;
  updatedAt?: string;
  company: {
    id: string;
    name: string;
    slug?: string;
  };
  /** Present on servers with company branding (v1.0+). */
  branding?: BrandingResponse;
  preferences?: UserThemePreferences;
  authProvider?: 'LOCAL' | 'GOOGLE';
}

/* ============================================================
   COMPANY BRANDING / THEMES
   Mirrors crm-backend-mongo/src/modules/company/company.service.ts
   ============================================================ */

export type ThemePresetName =
  | 'classic'
  | 'emerald'
  | 'sunset'
  | 'royal'
  | 'graphite';

export type ThemeColorMode = 'light' | 'dark' | 'system';
export type ThemeCornerStyle = 'sharp' | 'rounded' | 'pill';
export type ThemeDensity = 'compact' | 'comfortable';

export interface CompanyBrandingSettings {
  displayName: string | null;
  logoUrl: string | null;
  preset: ThemePresetName;
  primaryColor: string | null;
  accentColor: string | null;
  cornerStyle: ThemeCornerStyle;
  density: ThemeDensity;
  colorMode: ThemeColorMode;
  roleThemes: Partial<Record<Role, ThemePresetName>>;
  allowUserThemes: boolean;
}

export interface ResolvedBranding {
  preset: ThemePresetName;
  colorMode: ThemeColorMode;
  primaryColor: string | null;
  accentColor: string | null;
  cornerStyle: ThemeCornerStyle;
  density: ThemeDensity;
  displayName: string;
  logoUrl: string | null;
  source: 'user' | 'role' | 'company';
}

export interface UserThemePreferences {
  themePreset: ThemePresetName | null;
  colorMode: ThemeColorMode | null;
}

export interface CompanyBilling {
  legalName: string | null;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  bankDetails: string | null;
}

export interface BrandingResponse {
  company: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    locale: string;
    currency: string;
    /** Printed on invoices and receipts (v1.4). */
    billing?: CompanyBilling;
  };
  settings: CompanyBrandingSettings;
  preferences: UserThemePreferences;
  resolved: ResolvedBranding;
  canEdit: boolean;
}

export type BrandingUpdate = Partial<
  Omit<CompanyBrandingSettings, 'roleThemes'>
> & {
  roleThemes?: Partial<Record<Role, ThemePresetName | null>>;
};

export interface CompanyProfileUpdate {
  name?: string;
  slug?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  billing?: Partial<CompanyBilling>;
}

export interface PublicBranding {
  slug: string;
  displayName: string;
  logoUrl: string | null;
  preset: ThemePresetName;
  primaryColor: string | null;
  accentColor: string | null;
  cornerStyle: ThemeCornerStyle;
  density: ThemeDensity;
  colorMode: ThemeColorMode;
}

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

/* ============================================================
   CUSTOMER
   ============================================================ */

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  address: string | null;
  notes: string | null;
  /** Sales owner (v1.1+). */
  ownerId?: string | null;
  owner?: { id: string; name: string } | null;
  sharedWithIds?: string[];
  createdAt: string;
  updatedAt: string;
}

/* ============================================================
   LEADS
   ============================================================ */

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'UNQUALIFIED'
  | 'CONVERTED'
  | 'LOST';

export type LeadSource =
  | 'WEBSITE'
  | 'REFERRAL'
  | 'COLD_CALL'
  | 'SOCIAL_MEDIA'
  | 'EVENT'
  | 'OTHER';

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  status: LeadStatus;
  score: number | null;

  customerId: string | null;
  assignedToId: string | null;

  assignedTo: {
    id: string;
    name: string;
  } | null;

  customer: {
    id: string;
    name: string;
  } | null;

  /** Set when the lead was converted (v1.1+). */
  opportunityId?: string | null;
  convertedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

/* ============================================================
   OPPORTUNITIES
   ============================================================ */

export type OpportunityStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export interface Opportunity {
  id: string;
  title: string;
  amount: number;
  stage: OpportunityStage;
  closeDate: string | null;

  leadId: string | null;
  customerId: string | null;
  ownerId: string | null;

  owner: {
    id: string;
    name: string;
  } | null;

  customer: {
    id: string;
    name: string;
  } | null;

  createdAt: string;
  updatedAt: string;
}

/* ============================================================
   ACTIVITIES
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

export interface Activity {
  id: string;

  type: ActivityType;

  status: ActivityStatus;

  summary: string;

  notes: string | null;

  dueAt: string | null;

  /* ----------------------------------------------------------
     COMPLETION INFORMATION
     ---------------------------------------------------------- */

  completedAt: string | null;

  completedById: string | null;

  completedBy: {
    id: string;
    name: string;
    role: Role;
  } | null;

  /* ----------------------------------------------------------
     RELATED CRM RECORDS
     ---------------------------------------------------------- */

  customerId: string | null;

  leadId: string | null;

  opportunityId: string | null;

  /* ----------------------------------------------------------
     ASSIGNMENT
     ---------------------------------------------------------- */

  assignedToId: string | null;

  /** null = general team task (v1.4.2). */
  assignedTo?: {
    id: string;
    name: string;
    role?: Role;
  } | null;

  /* ----------------------------------------------------------
     CREATION INFORMATION
     ---------------------------------------------------------- */

  createdById: string | null;

  createdBy: {
    id: string;
    name: string;
  } | null;

  /* ----------------------------------------------------------
     TIMESTAMPS
     ---------------------------------------------------------- */

  createdAt: string;

  updatedAt: string;
}

/* ============================================================
   DASHBOARD
   ============================================================ */

export interface DashboardSummary {
  todaysSales: {
    total: number;
    orderCount: number;
  };

  monthlySales: {
    total: number;
    orderCount: number;
  };

  pendingTasks: number;

  todaysVisits: number;

  openLeads: number;

  pipeline: {
    openOpportunityCount: number;
    expectedRevenue: number;
  };

  topCustomers: {
    customerId: string;
    customerName: string;
    totalRevenue: number;
  }[];

  recentActivities: {
    id: string;
    type: string;
    summary: string;
    createdAt: string;

    createdBy: {
      id: string;
      name: string;
    } | null;
  }[];

  leadFunnel: {
    status: LeadStatus;
    count: number;
  }[];
}

/* ============================================================
   PRODUCTS
   ============================================================ */

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  price: number;
  stockQty: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ============================================================
   INVOICES
   ============================================================ */

export type InvoiceStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export interface InvoiceLineItem {
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;

  invoiceNumber: string;

  customerId: string;

  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address?: string | null;
    gstin?: string | null;
  } | null;

  lineItems: InvoiceLineItem[];

  subtotal: number;

  tax: number;

  total: number;

  status: InvoiceStatus;

  issueDate: string;

  dueDate: string;

  notes: string | null;

  createdAt: string;

  updatedAt: string;
}

/* ============================================================
   PAYMENTS
   ============================================================ */

export type PaymentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'OTHER';

export interface Payment {
  id: string;

  invoiceId:
    | {
        id: string;
        invoiceNumber: string;
        total: number;
        status: string;
      }
    | string;

  customerId:
    | {
        id: string;
        name: string;
      }
    | string;

  amount: number;

  method: PaymentMethod;

  status: PaymentStatus;

  reference: string | null;

  paidAt: string;

  createdAt: string;
}

/* ============================================================
   CALENDAR
   ============================================================ */

export type CalendarEventType =
  | 'MEETING'
  | 'CALL'
  | 'FOLLOW_UP'
  | 'DEADLINE'
  | 'OTHER';

export interface CalendarEvent {
  id: string;

  title: string;

  type: CalendarEventType;

  startAt: string;

  endAt: string;

  location: string | null;

  notes: string | null;

  customerId: {
    id: string;
    name: string;
  } | null;

  leadId: {
    id: string;
    name: string;
  } | null;

  opportunityId: {
    id: string;
    title: string;
  } | null;

  attendeeIds: {
    id: string;
    name: string;
  }[];

  createdById?: string | null;

  createdAt: string;
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */

export type NotificationType =
  | 'TASK'
  | 'LEAD'
  | 'DEAL'
  | 'INVOICE'
  | 'PAYMENT'
  | 'MEETING'
  | 'SYSTEM';

export interface AppNotification {
  id: string;

  type: NotificationType;

  title: string;

  message: string;

  isRead: boolean;

  relatedId: string | null;

  createdAt: string;
}

/* ============================================================
   SALES REPORTS
   ============================================================ */

export interface SalesReportRow {
  year: number;
  month: number;
  revenue: number;
  invoiceCount: number;
}

/* ============================================================
   LEAD CONVERSION REPORT
   ============================================================ */

export interface LeadConversionRow {
  source: string;
  total: number;
  converted: number;
  lost: number;
  conversionRate: number;
}

/* ============================================================
   DEALS REPORT
   ============================================================ */

export interface DealsReport {
  byStage: {
    stage: string;
    count: number;
    totalValue: number;
  }[];

  winRate: number;

  averageWonDealSize: number;

  totalWon: number;

  totalLost: number;
}

/* ============================================================
   TOP CUSTOMERS REPORT
   ============================================================ */

export interface TopCustomerRow {
  customerId: string;
  customerName: string;
  revenue: number;
  invoiceCount: number;
}

/* ============================================================
   AI LEAD SCORING
   ============================================================ */

export interface LeadScore {
  leadId: string;

  name: string;

  status: string;

  source: string;

  score: number;

  factors: {
    contactCompleteness: number;
    sourceQuality: number;
    freshness: number;
    engagement: number;
  };
}

/* ============================================================
   AI SALES FORECAST
   ============================================================ */

export interface SalesForecast {
  forecastedRevenue: number | null;

  basis: string;

  monthsOfHistory: number;

  trendDirection?: 'up' | 'down' | 'flat';

  history: SalesReportRow[];
}

/* ============================================================
   AI NEXT BEST ACTION
   ============================================================ */

export interface NextBestAction {
  type: string;

  message: string;

  relatedId: string;

  priority: 'high' | 'medium' | 'low';
}

/* ============================================================
   AI CUSTOMER INSIGHT
   ============================================================ */

export interface CustomerInsight {
  customerId: string;

  name: string;

  email: string | null;

  phone: string | null;

  reason: string;
}
/* ============================================================
   TEAMS
   ============================================================ */

export interface TeamMemberRef {
  id: string;
  name: string;
  role: Role;
}

export interface Team {
  id: string;
  name: string;
  territory: string | null;
  managerId: string | null;
  manager: TeamMemberRef | null;
  memberIds: string[];
  members: TeamMemberRef[];
  createdAt: string;
  updatedAt: string;
}

/* ============================================================
   DUPLICATES / CONVERSION
   ============================================================ */

export interface DuplicateMatch {
  type: 'lead' | 'customer';
  matchedOn: ('email' | 'phone')[];
  id?: string;
  name?: string;
  /** false = exists but belongs to a colleague outside your scope. */
  visible: boolean;
}

export interface ConvertLeadResult {
  lead: Lead;
  customerId: string;
  opportunityId: string | null;
  createdCustomer: boolean;
}
