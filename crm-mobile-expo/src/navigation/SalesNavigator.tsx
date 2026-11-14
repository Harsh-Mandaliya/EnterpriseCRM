import { LeadFormScreen } from '@/screens/forms/LeadFormScreen';
import { DealFormScreen } from '@/screens/forms/DealFormScreen';
import { ProductFormScreen } from '@/screens/forms/ProductFormScreen';
import { PaymentFormScreen } from '@/screens/forms/PaymentFormScreen';
import { TaskFormScreen } from '@/screens/forms/TaskFormScreen';
import { EventFormScreen } from '@/screens/forms/EventFormScreen';
import { PipelineScreen } from '@/screens/pipeline/PipelineScreen';
import { AnalyticsScreen } from '@/screens/analytics/AnalyticsScreen';
import { ReportsScreen } from '@/screens/reports/ReportsScreen';
import { TeamActivityScreen } from '@/screens/team/TeamActivityScreen';
import { InvoiceDetailScreen } from '@/screens/invoices/InvoiceDetailScreen';

import type { AppStackParamList } from '@/navigation/types';
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import { SalesDashboardScreen } from '@/screens/dashboard/SalesDashboardScreen';

import { CustomerListScreen } from '@/screens/customers/CustomerListScreen';
import { CustomerDetailScreen } from '@/screens/customers/CustomerDetailScreen';
import { CustomerFormScreen } from '@/screens/customers/CustomerFormScreen';

import { LeadListScreen } from '@/screens/leads/LeadListScreen';
import { LeadDetailScreen } from '@/screens/leads/LeadDetailScreen';


import { ActivitiesScreen } from '@/screens/activities/ActivitiesScreen';

import { ProductListScreen } from '@/screens/products/ProductListScreen';

import { InvoiceListScreen } from '@/screens/invoices/InvoiceListScreen';
import { InvoiceFormScreen } from '@/screens/invoices/InvoiceFormScreen';

import { PaymentListScreen } from '@/screens/payments/PaymentListScreen';

import { CalendarScreen } from '@/screens/calendar/CalendarScreen';

import { NotificationListScreen } from '@/screens/notifications/NotificationListScreen';

import { AiCenterScreen } from '@/screens/ai/AiCenterScreen';

import { ProfileScreen } from '@/screens/profile/ProfileScreen';

import { ThemeSettingsScreen } from '@/screens/settings/ThemeSettingsScreen';
import { TeamsScreen } from '@/screens/teams/TeamsScreen';

import { colors } from '@/theme/colors';
/**
 * SALES NAVIGATION
 *
 * Sales users only get access to their sales workspace.
 *
 * IMPORTANT:
 * We use a local navigation param list here.
 * Existing screens may currently use navigation types
 * from another navigator, so the Stack is intentionally
 * kept compatible while the role-wise navigation is being
 * separated.
 */

export type SalesStackParamList = AppStackParamList;

/**
 * Using any here prevents existing screens that still
 * reference Main/Owner/Manager navigation types from
 * producing component-prop incompatibility errors.
 *
 * We can strongly type every screen after the role
 * navigation is fully separated.
 */
const Stack =
  createNativeStackNavigator<SalesStackParamList>();

export function SalesNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="SalesDashboard"
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

      {/* =====================================================
          SALES DASHBOARD
         ===================================================== */}

      <Stack.Screen
        name="SalesDashboard"
        component={SalesDashboardScreen}
        options={{
          headerShown: false,
        }}
      />

      {/* =====================================================
          CUSTOMERS
         ===================================================== */}

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
        component={CustomerFormScreen}
        options={{
          headerShown: false,
          title: 'Customer',
        }}
      />

      {/* =====================================================
          LEADS
         ===================================================== */}

      <Stack.Screen
        name="LeadList"
        component={LeadListScreen}
        options={{
          title: 'My Leads',
          headerShown: false, // the screen draws its own top bar
        }}
      />

      <Stack.Screen
        name="LeadDetail"
        component={LeadDetailScreen}
        options={{
          title: 'Lead',
          headerShown: false,
        }}
      />

      {/* =====================================================
          OPPORTUNITIES
         ===================================================== */}

      <Stack.Screen
        name="OpportunitiesBoard"
        component={PipelineScreen}
        options={{
          headerShown: false,
          title: 'My Deals',
        }}
      />

      {/* =====================================================
          ACTIVITIES / TASKS
         ===================================================== */}

      <Stack.Screen
        name="Activities"
        component={ActivitiesScreen}
        options={{ headerShown: false }}
      />

      {/* =====================================================
          PRODUCTS
         ===================================================== */}

      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{
          title: 'Products',
        }}
      />

      {/* =====================================================
          INVOICES
         ===================================================== */}

      <Stack.Screen
        name="InvoiceList"
        component={InvoiceListScreen}
        options={{
          title: 'My Invoices',
        }}
      />

      <Stack.Screen
        name="InvoiceForm"
        component={InvoiceFormScreen}
        options={{
          headerShown: false,
          title: 'Invoice',
        }}
      />

      {/* =====================================================
          PAYMENTS
         ===================================================== */}

      <Stack.Screen
        name="PaymentList"
        component={PaymentListScreen}
        options={{
          title: 'Payments',
        }}
      />

      {/* =====================================================
          CALENDAR
         ===================================================== */}

      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ headerShown: false }}
      />

      {/* =====================================================
          NOTIFICATIONS
         ===================================================== */}

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

      {/* =====================================================
          AI
         ===================================================== */}

      <Stack.Screen
        name="AiCenter"
        component={AiCenterScreen}
        options={{ headerShown: false }}
      />

      {/* =====================================================
          PROFILE
         ===================================================== */}

      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
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
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}