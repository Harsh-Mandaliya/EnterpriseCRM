import { LeadFormScreen } from '@/screens/forms/LeadFormScreen';
import { DealFormScreen } from '@/screens/forms/DealFormScreen';
import { ProductFormScreen } from '@/screens/forms/ProductFormScreen';
import { PaymentFormScreen } from '@/screens/forms/PaymentFormScreen';
import { TaskFormScreen } from '@/screens/forms/TaskFormScreen';
import { EventFormScreen } from '@/screens/forms/EventFormScreen';
import { PipelineScreen } from '@/screens/pipeline/PipelineScreen';
import { AnalyticsScreen } from '@/screens/analytics/AnalyticsScreen';
import { CompanyBillingScreen } from '@/screens/settings/CompanyBillingScreen';
import { TeamActivityScreen } from '@/screens/team/TeamActivityScreen';
import { InvoiceDetailScreen } from '@/screens/invoices/InvoiceDetailScreen';

import type { AppStackParamList } from '@/navigation/types';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';


/* ============================================================
   SCREENS
============================================================ */

import {
  DashboardScreen,
} from '@/screens/dashboard/DashboardScreen';

import {
  ManagerDashboardScreen,
} from '@/screens/dashboard/ManagerDashboardScreen';

import {
  CustomerListScreen,
} from '@/screens/customers/CustomerListScreen';

import {
  CustomerDetailScreen,
} from '@/screens/customers/CustomerDetailScreen';

import {
  CustomerFormScreen,
} from '@/screens/customers/CustomerFormScreen';

import {
  LeadListScreen,
} from '@/screens/leads/LeadListScreen';

import {
  LeadDetailScreen,
} from '@/screens/leads/LeadDetailScreen';


import {
  ActivitiesScreen,
} from '@/screens/activities/ActivitiesScreen';

import {
  ProfileScreen,
} from '@/screens/profile/ProfileScreen';

import { ThemeSettingsScreen } from '@/screens/settings/ThemeSettingsScreen';
import { TeamsScreen } from '@/screens/teams/TeamsScreen';

import {
  UserManagementScreen,
} from '@/screens/users/UserManagementScreen';

import {
  ProductListScreen,
} from '@/screens/products/ProductListScreen';

import {
  InvoiceListScreen,
} from '@/screens/invoices/InvoiceListScreen';

import {
  InvoiceFormScreen,
} from '@/screens/invoices/InvoiceFormScreen';

import {
  PaymentListScreen,
} from '@/screens/payments/PaymentListScreen';

import {
  CalendarScreen,
} from '@/screens/calendar/CalendarScreen';

import {
  NotificationListScreen,
} from '@/screens/notifications/NotificationListScreen';

import {
  ReportsScreen,
} from '@/screens/reports/ReportsScreen';

import {
  AiCenterScreen,
} from '@/screens/ai/AiCenterScreen';


/* ============================================================
   THEME / TYPES
============================================================ */

import {
  colors,
} from '@/theme/colors';


/* ============================================================
   NAVIGATION PARAM LIST
============================================================ */

export type MainStackParamList = AppStackParamList;


/* ============================================================
   STACK
============================================================ */

const Stack =
  createNativeStackNavigator<
    MainStackParamList
  >();


/* ============================================================
   NAVIGATOR
============================================================ */

export function OwnerNavigator() {

  return (

    <Stack.Navigator

      initialRouteName="Dashboard"

      screenOptions={{

        /* ----------------------------------------------------
           DEFAULT NATIVE HEADER
        ---------------------------------------------------- */

        headerStyle: {
          backgroundColor:
            colors.surface,
        },

        headerTintColor:
          colors.text,

        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: colors.text,
        },

        headerShadowVisible: false,

        headerBackTitle: '',

        animation:
          'slide_from_right',

        contentStyle: {
          backgroundColor:
            colors.background,
        },

      }}
    >


      {/* ======================================================
          OWNER DASHBOARD
      ====================================================== */}

      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerShown: true,
        }}
      />


      {/* ======================================================
          MANAGER DASHBOARD
      ====================================================== */}

      <Stack.Screen
        name="ManagerDashboard"
        component={ManagerDashboardScreen}
        options={{
          title: 'Manager Dashboard',
          headerShown: true,
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
        component={CustomerFormScreen}
        options={({ route }) => ({
          title:
            route.params?.customer
              ? 'Edit Customer'
              : 'New Customer',

          presentation: 'modal',

          animation:
            'slide_from_bottom',

          headerShown: false,
        })}
      />


      {/* ======================================================
          LEADS
      ====================================================== */}

      {/*
        IMPORTANT:

        LeadListScreen has its own custom header.
        Therefore native header MUST be disabled.
      */}

      <Stack.Screen
        name="LeadList"
        component={LeadListScreen}
        options={{
          headerShown: false,
        }}
      />


      {/*
        LeadDetailScreen also has its own custom header.
      */}

      <Stack.Screen
        name="LeadDetail"
        component={LeadDetailScreen}
        options={{
          headerShown: false,
        }}
      />


      {/* ======================================================
          DEALS
      ====================================================== */}

      <Stack.Screen
        name="OpportunitiesBoard"
        component={PipelineScreen}
        options={{
          headerShown: false,
          title: 'Deals',
          }}
      />


      {/* ======================================================
          ACTIVITIES / TASKS
      ====================================================== */}

      <Stack.Screen
        name="Activities"
        component={ActivitiesScreen}
        options={{ headerShown: false }}
      />


      {/* ======================================================
          PROFILE
      ====================================================== */}

      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerShown: true,
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


      {/* ======================================================
          TEAM
      ====================================================== */}

      <Stack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{
          title: 'Team',
          headerShown: true,
        }}
      />


      {/* ======================================================
          PRODUCTS
      ====================================================== */}

      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{
          title: 'Products',
          headerShown: true,
        }}
      />


      {/* ======================================================
          INVOICES
      ====================================================== */}

      <Stack.Screen
        name="InvoiceList"
        component={InvoiceListScreen}
        options={{
          title: 'Invoices',
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="InvoiceForm"
        component={InvoiceFormScreen}
        options={{
          headerShown: false,
          title: 'New Invoice',

          presentation: 'modal',

          animation:
            'slide_from_bottom',

          }}
      />


      {/* ======================================================
          PAYMENTS
      ====================================================== */}

      <Stack.Screen
        name="PaymentList"
        component={PaymentListScreen}
        options={{
          title: 'Payments',
          headerShown: true,
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
          AI CENTER
      ====================================================== */}

      <Stack.Screen
        name="AiCenter"
        component={AiCenterScreen}
        options={{ headerShown: false }}
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
        name="CompanyBilling"
        component={CompanyBillingScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}