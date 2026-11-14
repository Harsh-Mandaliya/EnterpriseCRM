import { LeadFormScreen } from '@/screens/forms/LeadFormScreen';
import { DealFormScreen } from '@/screens/forms/DealFormScreen';
import { ProductFormScreen } from '@/screens/forms/ProductFormScreen';
import { PaymentFormScreen } from '@/screens/forms/PaymentFormScreen';
import { TaskFormScreen } from '@/screens/forms/TaskFormScreen';
import { EventFormScreen } from '@/screens/forms/EventFormScreen';
import { PipelineScreen } from '@/screens/pipeline/PipelineScreen';
import { AnalyticsScreen } from '@/screens/analytics/AnalyticsScreen';
import { TeamActivityScreen } from '@/screens/team/TeamActivityScreen';
import { InvoiceDetailScreen } from '@/screens/invoices/InvoiceDetailScreen';

import type { AppStackParamList } from '@/navigation/types';
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

/* ============================================================
   DASHBOARD
============================================================ */

import {
  AdminDashboardScreen,
} from '@/screens/dashboard/AdminDashboardScreen';

/* ============================================================
   CUSTOMERS
============================================================ */

import {
  CustomerListScreen,
} from '@/screens/customers/CustomerListScreen';

import {
  CustomerDetailScreen,
} from '@/screens/customers/CustomerDetailScreen';

import {
  CustomerFormScreen,
} from '@/screens/customers/CustomerFormScreen';

/* ============================================================
   LEADS
============================================================ */

import {
  LeadListScreen,
} from '@/screens/leads/LeadListScreen';

import {
  LeadDetailScreen,
} from '@/screens/leads/LeadDetailScreen';

/* ============================================================
   OPPORTUNITIES
============================================================ */


/* ============================================================
   ACTIVITIES
============================================================ */

import {
  ActivitiesScreen,
} from '@/screens/activities/ActivitiesScreen';

/* ============================================================
   PRODUCTS
============================================================ */

import {
  ProductListScreen,
} from '@/screens/products/ProductListScreen';

/* ============================================================
   INVOICES
============================================================ */

import {
  InvoiceListScreen,
} from '@/screens/invoices/InvoiceListScreen';

import {
  InvoiceFormScreen,
} from '@/screens/invoices/InvoiceFormScreen';

/* ============================================================
   PAYMENTS
============================================================ */

import {
  PaymentListScreen,
} from '@/screens/payments/PaymentListScreen';

/* ============================================================
   CALENDAR
============================================================ */

import {
  CalendarScreen,
} from '@/screens/calendar/CalendarScreen';

/* ============================================================
   NOTIFICATIONS
============================================================ */

import {
  NotificationListScreen,
} from '@/screens/notifications/NotificationListScreen';

/* ============================================================
   REPORTS
============================================================ */

import {
  ReportsScreen,
} from '@/screens/reports/ReportsScreen';

/* ============================================================
   AI
============================================================ */

import {
  AiCenterScreen,
} from '@/screens/ai/AiCenterScreen';

/* ============================================================
   PROFILE
============================================================ */

import {
  ProfileScreen,
} from '@/screens/profile/ProfileScreen';

import { ThemeSettingsScreen } from '@/screens/settings/ThemeSettingsScreen';
import { TeamsScreen } from '@/screens/teams/TeamsScreen';

/* ============================================================
   USERS
============================================================ */

import {
  UserManagementScreen,
} from '@/screens/users/UserManagementScreen';

import { colors } from '@/theme/colors';
/* ============================================================
   ADMIN ROUTES
============================================================ */

export type AdminStackParamList = AppStackParamList;

/* ============================================================
   STACK
============================================================ */

/*
 * `any` here prevents React Navigation from rejecting existing
 * screens whose own navigation props were typed against another
 * stack.
 *
 * The actual route names are still defined by AdminStackParamList.
 */

const Stack =
  createNativeStackNavigator<AdminStackParamList>();

/* ============================================================
   ADMIN NAVIGATOR
============================================================ */

export function AdminNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },

        headerTintColor: colors.text,

        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '700',
        },

        headerShadowVisible: false,

        animation: 'slide_from_right',
      }}
    >

      {/* ======================================================
          DASHBOARD
      ====================================================== */}

      <Stack.Screen
        name="AdminDashboard"
        component={
          AdminDashboardScreen
        }
        options={{
          headerShown: false,
        }}
      />

      {/* ======================================================
          USER MANAGEMENT
      ====================================================== */}

      <Stack.Screen
        name="UserManagement"
        component={
          UserManagementScreen
        }
        options={{
          title: 'User Management',
        }}
      />

      {/* ======================================================
          CUSTOMERS
      ====================================================== */}

      <Stack.Screen
        name="CustomerList"
        component={CustomerListScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="CustomerForm"
        component={
          CustomerFormScreen
        }
        options={{
          headerShown: false,
          title: 'Customer',
        }}
      />

      {/* ======================================================
          LEADS
      ====================================================== */}

      <Stack.Screen
        name="LeadList"
        component={
          LeadListScreen
        }
        options={{
          title: 'Leads',
          headerShown: false, // the screen draws its own top bar
        }}
      />

      <Stack.Screen
        name="LeadDetail"
        component={
          LeadDetailScreen
        }
        options={{
          title: 'Lead',
          headerShown: false,
        }}
      />

      {/* ======================================================
          OPPORTUNITIES
      ====================================================== */}

      <Stack.Screen
        name="OpportunitiesBoard"
        component={PipelineScreen}
        options={{
          headerShown: false,
          title: 'Opportunities',
        }}
      />

      {/* ======================================================
          ACTIVITIES
      ====================================================== */}

      <Stack.Screen
        name="Activities"
        component={ActivitiesScreen}
        options={{ headerShown: false }}
      />

      {/* ======================================================
          PRODUCTS
      ====================================================== */}

      <Stack.Screen
        name="ProductList"
        component={
          ProductListScreen
        }
        options={{
          title: 'Products',
        }}
      />

      {/* ======================================================
          INVOICES
      ====================================================== */}

      <Stack.Screen
        name="InvoiceList"
        component={
          InvoiceListScreen
        }
        options={{
          title: 'Invoices',
        }}
      />

      <Stack.Screen
        name="InvoiceForm"
        component={
          InvoiceFormScreen
        }
        options={{
          headerShown: false,
          title: 'Invoice',
        }}
      />

      {/* ======================================================
          PAYMENTS
      ====================================================== */}

      <Stack.Screen
        name="PaymentList"
        component={
          PaymentListScreen
        }
        options={{
          title: 'Payments',
        }}
      />

      {/* ======================================================
          CALENDAR
      ====================================================== */}

      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ headerShown: false }}
      />

      {/* ======================================================
          NOTIFICATIONS
      ====================================================== */}

      <Stack.Screen
        name="NotificationList"
        component={
          NotificationListScreen
        }
        options={{
          headerShown: false,
          title: 'Notifications',
        }}
      />

      {/* ======================================================
          REPORTS
      ====================================================== */}

      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ headerShown: false }}
      />

      {/* ======================================================
          AI
      ====================================================== */}

      <Stack.Screen
        name="AiCenter"
        component={AiCenterScreen}
        options={{ headerShown: false }}
      />

      {/* ======================================================
          PROFILE
      ====================================================== */}

      <Stack.Screen
        name="Profile"
        component={
          ProfileScreen
        }
        options={{
          title: 'Admin Profile',
        }}
      />

      {/* ======================================================
          THEME & BRANDING
      ====================================================== */}

      <Stack.Screen
        name="ThemeSettings"
        component={ThemeSettingsScreen}
        options={{
          title: 'Theme & Branding',
          headerShown: true,
        }}
      />

      {/* ======================================================
          FORMS, PIPELINE & ANALYTICS (own gradient headers)
      ====================================================== */}
      <Stack.Screen
        name="LeadForm"
        component={LeadFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DealForm"
        component={DealFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductForm"
        component={ProductFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PaymentForm"
        component={PaymentFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskForm"
        component={TaskFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventForm"
        component={EventFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Pipeline"
        component={PipelineScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ headerShown: false }}
      />

      {/* ======================================================
          TEAMS & TERRITORIES
      ====================================================== */}

      <Stack.Screen
        name="Teams"
        component={TeamsScreen}
        options={{
          title: 'Teams',
          headerShown: true,
        }}
      />

      {/* v1.4 */}
      <Stack.Screen
        name="InvoiceDetail"
        component={InvoiceDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TeamActivity"
        component={TeamActivityScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}