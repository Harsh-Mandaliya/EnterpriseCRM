import React from 'react';
import { TaskFormScreen } from '@/screens/forms/TaskFormScreen';
import { EventFormScreen } from '@/screens/forms/EventFormScreen';
import { AnalyticsScreen } from '@/screens/analytics/AnalyticsScreen';

import type { AppStackParamList } from '@/navigation/types';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  EmployeeDashboardScreen,
} from '@/screens/dashboard/EmployeeDashboardScreen';

import { CustomerListScreen } from '@/screens/customers/CustomerListScreen';
import { CustomerDetailScreen } from '@/screens/customers/CustomerDetailScreen';
import { CustomerFormScreen } from '@/screens/customers/CustomerFormScreen';

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

      <Stack.Screen
        name="CustomerList"
        component={
          CustomerListScreen
        }
      />

      <Stack.Screen
        name="CustomerDetail"
        component={
          CustomerDetailScreen
        }
      />

      <Stack.Screen
        name="CustomerForm"
        component={
          CustomerFormScreen
        }
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Activities"
        component={
          ActivitiesScreen
        }
      />

      <Stack.Screen
        name="Calendar"
        component={
          CalendarScreen
        }
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

    </Stack.Navigator>
  );
}