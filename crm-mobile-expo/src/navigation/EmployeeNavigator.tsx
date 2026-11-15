import { TaskFormScreen } from '@/screens/forms/TaskFormScreen';
import { EventFormScreen } from '@/screens/forms/EventFormScreen';
import { AnalyticsScreen } from '@/screens/analytics/AnalyticsScreen';
import { AiCenterScreen } from '@/screens/ai/AiCenterScreen';
import { ReportsScreen } from '@/screens/reports/ReportsScreen';
import { TeamActivityScreen } from '@/screens/team/TeamActivityScreen';
import { AccountDetailsScreen } from '@/screens/settings/AccountDetailsScreen';
import { ChangePasswordScreen } from '@/screens/settings/ChangePasswordScreen';

import type { AppStackParamList } from '@/navigation/types';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  EmployeeDashboardScreen,
} from '@/screens/dashboard/EmployeeDashboardScreen';

import { ProductListScreen } from '@/screens/products/ProductListScreen';

import { ActivitiesScreen } from '@/screens/activities/ActivitiesScreen';

import { CalendarScreen } from '@/screens/calendar/CalendarScreen';

import {
  NotificationListScreen,
} from '@/screens/notifications/NotificationListScreen';

import { ProfileScreen } from '@/screens/profile/ProfileScreen';

import { ThemeSettingsScreen } from '@/screens/settings/ThemeSettingsScreen';
import { TeamsScreen } from '@/screens/teams/TeamsScreen';


import { colors } from '@/theme/colors';
/* ============================================================
   PARAM LIST
============================================================ */

export type EmployeeStackParamList = AppStackParamList;


/* ============================================================
   STACK
============================================================ */

const Stack =
  createNativeStackNavigator<EmployeeStackParamList>();


/* ============================================================
   EMPLOYEE NAVIGATOR
============================================================ */

export function EmployeeNavigator() {

  return (
    <Stack.Navigator
      initialRouteName="EmployeeDashboard"
      screenOptions={{
        headerShown: false,
        animation:
          'slide_from_right',
        contentStyle: {
          backgroundColor:
            colors.background,
        },
      }}
    >

      <Stack.Screen
        name="EmployeeDashboard"
        component={
          EmployeeDashboardScreen
        }
      />

      {/* No customer, lead, deal or invoice screens: those belong to sales. The price list is view-only. */}
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{ headerShown: false }} />

      <Stack.Screen
        name="Activities"
        component={ActivitiesScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="NotificationList"
        component={
          NotificationListScreen
        }
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Profile"
        component={
          ProfileScreen
        }
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
      <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
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
      <Stack.Screen
        name="AiCenter"
        component={AiCenterScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}