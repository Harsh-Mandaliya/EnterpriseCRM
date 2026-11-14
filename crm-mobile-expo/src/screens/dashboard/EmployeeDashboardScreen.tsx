import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmployeeDashboardSummary,
  getEmployeeDashboardSummary,
} from '@/api/employeeDashboard.api';

import { useAppSelector } from '@/hooks/useRedux';


import { createThemedStyles, createThemedValue } from '@/theme/themeStore';
import { colors } from '@/theme/colors';
/* ============================================================
   NAVIGATION
============================================================ */

type Navigation = {
  navigate: (
    screen: string,
    params?: any,
  ) => void;
};


/* ============================================================
   COLORS
============================================================ */

const COLORS = createThemedValue(() => ({
  background: colors.background,
  surface: colors.surface,

  primary: colors.primary,
  primaryDark: colors.primaryDark,
  primarySoft: colors.primaryLight,

  text: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textFaint,

  border: colors.border,

  green: colors.success,
  greenSoft: colors.successSoft,

  orange: colors.warning,
  orangeSoft: colors.warningSoft,

  purple: colors.accent,
  purpleSoft: colors.accentSoft,

  red: colors.danger,
  redSoft: colors.dangerSoft,

  white: colors.textInverse,
}));


/* ============================================================
   PERFORMANCE CARD
============================================================ */

function PerformanceCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  iconBackground,
  onPress,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBackground: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.performanceCard}>

      <View
        style={[
          styles.performanceIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Text
          style={[
            styles.performanceIconText,
            {
              color: iconColor,
            },
          ]}
        >
          {icon}
        </Text>
      </View>

      <View
        style={styles.performanceInfo}
      >
        <Text
          style={styles.performanceTitle}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text
          style={styles.performanceValue}
          numberOfLines={1}
        >
          {value}
        </Text>

        <Text
          style={styles.performanceSubtitle}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

    </View>
  );

  if (!onPress) {
    return (
      <View
        style={
          styles.performanceWrapper
        }
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.performanceWrapper,
        pressed &&
          styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}


/* ============================================================
   QUICK ACTION
============================================================ */

function QuickAction({
  title,
  subtitle,
  icon,
  color,
  background,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  background: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        pressed &&
          styles.pressed,
      ]}
    >

      <View
        style={[
          styles.quickIcon,
          {
            backgroundColor:
              background,
          },
        ]}
      >
        <Text
          style={[
            styles.quickIconText,
            {
              color,
            },
          ]}
        >
          {icon}
        </Text>
      </View>

      <Text
        style={styles.quickTitle}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        style={styles.quickSubtitle}
        numberOfLines={1}
      >
        {subtitle}
      </Text>

    </Pressable>
  );
}


/* ============================================================
   EMPLOYEE DASHBOARD
============================================================ */

export function EmployeeDashboardScreen({
  navigation,
}: {
  navigation: Navigation;
}) {

  /* ==========================================================
     SCREEN SIZE
  ========================================================== */

  const { width } =
    useWindowDimensions();

  const isSmallScreen =
    width < 380;

  const horizontalPadding =
    isSmallScreen ? 14 : 18;


  /* ==========================================================
     AUTH USER
  ========================================================== */

  const user = useAppSelector(
    state => state.auth.user,
  );


  /* ==========================================================
     STATE
  ========================================================== */

  const [summary, setSummary] =
    useState<EmployeeDashboardSummary | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);


  /* ==========================================================
     USER
  ========================================================== */

  const firstName = useMemo(() => {

    const name =
      user?.name?.trim();

    if (!name) {
      return 'there';
    }

    return name.split(' ')[0];

  }, [user?.name]);


  const initials = useMemo(() => {

    const name =
      user?.name?.trim();

    if (!name) {
      return 'E';
    }

    return name
      .charAt(0)
      .toUpperCase();

  }, [user?.name]);


  /* ==========================================================
     LOAD DASHBOARD
  ========================================================== */

  const loadDashboard =
    useCallback(async () => {

      try {

        setError(null);

        const data =
          await getEmployeeDashboardSummary();

        console.log(
          '[EMPLOYEE DASHBOARD]',
          data,
        );

        setSummary(data);

      } catch (err: any) {

        console.error(
          '[EMPLOYEE DASHBOARD ERROR]',
          err,
        );

        setError(
          err?.response?.data?.error ??
            err?.message ??
            'Unable to load dashboard.',
        );

      } finally {

        setLoading(false);
        setRefreshing(false);

      }

    }, []);


  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);


  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };


  /* ==========================================================
     VALUES
  ========================================================== */

  const myTasks =
    Number(
      summary?.myTasks ?? 0,
    );

  const todaysActivities =
    Number(
      summary?.todaysActivities ?? 0,
    );

  const todaysMeetings =
    Number(
      summary?.todaysMeetings ?? 0,
    );

  const overdueTasks =
    Number(
      summary?.overdueTasks ?? 0,
    );

  const completedTasks =
    Number(
      summary?.completedTasks ?? 0,
    );

  const pendingTasks =
    Number(
      summary?.pendingTasks ?? 0,
    );

  const upcomingActivities =
    Number(
      summary?.upcomingActivities ?? 0,
    );


  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    loading &&
    !summary
  ) {

    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
        edges={[
          'top',
          'bottom',
        ]}
      >


        <ActivityIndicator
          size="small"
          color={
            COLORS.primary
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading dashboard...
        </Text>

      </SafeAreaView>
    );
  }


  /* ==========================================================
     MAIN
  ========================================================== */

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        'top',
        'bottom',
      ]}
    >


      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal:
              horizontalPadding,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor={
              COLORS.primary
            }
          />
        }
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <View
          style={styles.header}
        >

          <View
            style={
              styles.headerContent
            }
          >

            <Text
              style={
                styles.roleLabel
              }
            >
              EMPLOYEE
            </Text>

            <Text
              style={
                styles.greeting
              }
            >
              Hello, {firstName} 👋
            </Text>

            <Text
              style={
                styles.pageTitle
              }
            >
              My Work Dashboard
            </Text>

            <Text
              style={
                styles.pageSubtitle
              }
              numberOfLines={2}
            >
              Complete assigned work and
              stay on top of today's activities.
            </Text>

          </View>

          <Pressable
            style={
              styles.profileButton
            }
            onPress={() =>
              navigation.navigate(
                'Profile',
              )
            }
          >
            <Text
              style={
                styles.profileInitial
              }
            >
              {initials}
            </Text>
          </Pressable>

        </View>


        {/* ====================================================
            ERROR
        ==================================================== */}

        {error ? (
          <View
            style={
              styles.errorCard
            }
          >

            <View
              style={
                styles.errorContent
              }
            >

              <Text
                style={
                  styles.errorTitle
                }
              >
                Dashboard unavailable
              </Text>

              <Text
                style={
                  styles.errorMessage
                }
                numberOfLines={2}
              >
                {error}
              </Text>

            </View>

            <Pressable
              style={
                styles.retryButton
              }
              onPress={
                loadDashboard
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Retry
              </Text>
            </Pressable>

          </View>
        ) : null}


        {/* ====================================================
            TODAY'S FOCUS
        ==================================================== */}

        <View
          style={
            styles.focusCard
          }
        >

          <View
            style={
              styles.focusIcon
            }
          >
            <Text
              style={
                styles.focusIconText
              }
            >
              ✓
            </Text>
          </View>

          <View
            style={
              styles.focusContent
            }
          >

            <Text
              style={
                styles.focusTitle
              }
            >
              Today's Focus
            </Text>

            <Text
              style={
                styles.focusDescription
              }
              numberOfLines={2}
            >
              Complete assigned tasks, attend
              meetings and finish today's work.
            </Text>

          </View>

          <View
            style={
              styles.focusArrow
            }
          >
            <Text
              style={
                styles.focusArrowText
              }
            >
              →
            </Text>
          </View>

        </View>


        {/* ====================================================
            MY PERFORMANCE
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            My Performance
          </Text>

          <Text
            style={
              styles.sectionHint
            }
          >
            Overview
          </Text>

        </View>


        {/* ====================================================
            PERFORMANCE GRID
        ==================================================== */}

        <View
          style={styles.performanceGrid}
        >

          <PerformanceCard
            title="My Tasks"
            value={String(
              myTasks,
            )}
            subtitle="Assigned to me"
            icon="✓"
            iconColor={
              COLORS.primary
            }
            iconBackground={
              COLORS.primarySoft
            }
            onPress={() =>
              navigation.navigate(
                'Activities',
              )
            }
          />

          <PerformanceCard
            title="Activities"
            value={String(
              todaysActivities,
            )}
            subtitle="Today's work"
            icon="◷"
            iconColor={
              COLORS.purple
            }
            iconBackground={
              COLORS.purpleSoft
            }
            onPress={() =>
              navigation.navigate(
                'Activities',
              )
            }
          />

          <PerformanceCard
            title="Meetings"
            value={String(
              todaysMeetings,
            )}
            subtitle="Today"
            icon="□"
            iconColor={
              COLORS.green
            }
            iconBackground={
              COLORS.greenSoft
            }
            onPress={() =>
              navigation.navigate(
                'Calendar',
              )
            }
          />

          <PerformanceCard
            title="Overdue"
            value={String(
              overdueTasks,
            )}
            subtitle="Need attention"
            icon="!"
            iconColor={
              COLORS.orange
            }
            iconBackground={
              COLORS.orangeSoft
            }
            onPress={() =>
              navigation.navigate(
                'Activities',
              )
            }
          />

        </View>


        {/* ====================================================
            TODAY
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Today
          </Text>

        </View>


        <View
          style={
            styles.todayCard
          }
        >

          <View
            style={
              styles.todayItem
            }
          >

            <Text
              style={
                styles.todayValue
              }
            >
              {todaysActivities}
            </Text>

            <Text
              style={
                styles.todayLabel
              }
            >
              Activities
            </Text>

          </View>


          <View
            style={
              styles.todayDivider
            }
          />


          <View
            style={
              styles.todayItem
            }
          >

            <Text
              style={[
                styles.todayValue,
                {
                  color:
                    COLORS.orange,
                },
              ]}
            >
              {pendingTasks}
            </Text>

            <Text
              style={
                styles.todayLabel
              }
            >
              Pending
            </Text>

          </View>


          <View
            style={
              styles.todayDivider
            }
          />


          <View
            style={
              styles.todayItem
            }
          >

            <Text
              style={[
                styles.todayValue,
                {
                  color:
                    COLORS.green,
                },
              ]}
            >
              {todaysMeetings}
            </Text>

            <Text
              style={
                styles.todayLabel
              }
            >
              Meetings
            </Text>

          </View>

        </View>


        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Quick Actions
          </Text>

        </View>


        <View
          style={
            styles.quickGrid
          }
        >

          <QuickAction
            title="Tasks"
            subtitle="My work"
            icon="✓"
            color={
              COLORS.primary
            }
            background={
              COLORS.primarySoft
            }
            onPress={() =>
              navigation.navigate(
                'Activities',
              )
            }
          />

          <QuickAction
            title="Calendar"
            subtitle="Meetings"
            icon="□"
            color={
              COLORS.green
            }
            background={
              COLORS.greenSoft
            }
            onPress={() =>
              navigation.navigate(
                'Calendar',
              )
            }
          />

          <QuickAction
            title="Activities"
            subtitle="My activity"
            icon="◷"
            color={
              COLORS.purple
            }
            background={
              COLORS.purpleSoft
            }
            onPress={() =>
              navigation.navigate(
                'Activities',
              )
            }
          />

          <QuickAction
            title="Customers"
            subtitle="Clients"
            icon="♙"
            color={
              COLORS.green
            }
            background={
              COLORS.greenSoft
            }
            onPress={() =>
              navigation.navigate(
                'CustomerList',
              )
            }
          />

          <QuickAction
            title="Notifications"
            subtitle="Updates"
            icon="!"
            color={
              COLORS.orange
            }
            background={
              COLORS.orangeSoft
            }
            onPress={() =>
              navigation.navigate(
                'NotificationList',
              )
            }
          />

          <QuickAction
            title="Profile"
            subtitle="My account"
            icon="●"
            color={
              COLORS.primary
            }
            background={
              COLORS.primarySoft
            }
            onPress={() =>
              navigation.navigate(
                'Profile',
              )
            }
          />

        </View>


        {/* ====================================================
            WORK SUMMARY
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Work Summary
          </Text>

        </View>


        <View
          style={
            styles.summaryCard
          }
        >

          <View
            style={
              styles.summaryHeader
            }
          >

            <View
              style={
                styles.summaryHeaderIcon
              }
            >
              <Text
                style={
                  styles.summaryHeaderIconText
                }
              >
                ✓
              </Text>
            </View>

            <View
              style={
                styles.summaryHeaderContent
              }
            >

              <Text
                style={
                  styles.summaryTitle
                }
              >
                Your work status
              </Text>

              <Text
                style={
                  styles.summarySubtitle
                }
              >
                Keep your assigned work on track.
              </Text>

            </View>

          </View>


          <View
            style={
              styles.summaryStats
            }
          >

            <View
              style={
                styles.summaryStat
              }
            >

              <Text
                style={
                  styles.summaryValue
                }
              >
                {completedTasks}
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Completed
              </Text>

            </View>


            <View
              style={
                styles.summaryStat
              }
            >

              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      COLORS.orange,
                  },
                ]}
              >
                {pendingTasks}
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Pending
              </Text>

            </View>


            <View
              style={
                styles.summaryStat
              }
            >

              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      COLORS.purple,
                  },
                ]}
              >
                {upcomingActivities}
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Upcoming
              </Text>

            </View>

          </View>


          <Pressable
            style={({ pressed }) => [
              styles.workButton,
              pressed &&
                styles.workButtonPressed,
            ]}
            onPress={() =>
              navigation.navigate(
                'Activities',
              )
            }
          >

            <Text
              style={
                styles.workButtonText
              }
            >
              View My Work
            </Text>

            <Text
              style={
                styles.workButtonArrow
              }
            >
              →
            </Text>

          </Pressable>

        </View>


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <View
          style={
            styles.footer
          }
        >

          <Text
            style={
              styles.footerTitle
            }
          >
            Enterprise AI CRM
          </Text>

          <Text
            style={
              styles.footerSubtitle
            }
          >
            Employee Workspace
          </Text>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles =
  createThemedStyles(() => StyleSheet.create({

    /* ========================================================
       BASE
    ======================================================== */

    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    content: {
      paddingTop: 12,
      paddingBottom: 30,
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.background,
    },

    loadingText: {
      marginTop: 8,
      color: COLORS.secondary,
      fontSize: 12,
      fontWeight: '500',
    },


    /* ========================================================
       HEADER
    ======================================================== */

    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 16,
    },

    headerContent: {
      flex: 1,
      paddingRight: 12,
    },

    roleLabel: {
      color: COLORS.primary,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800',
      letterSpacing: 1.2,
      marginBottom: 3,
    },

    greeting: {
      color: COLORS.secondary,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '500',
      marginBottom: 2,
    },

    pageTitle: {
      color: COLORS.text,
      fontSize: 25,
      lineHeight: 30,
      fontWeight: '800',
      letterSpacing: -0.5,
    },

    pageSubtitle: {
      color: COLORS.secondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
      maxWidth: 330,
    },

    profileButton: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor:
        COLORS.primary,
      alignItems: 'center',
      justifyContent:
        'center',
      marginTop: 2,
    },

    profileInitial: {
      color: COLORS.white,
      fontSize: 19,
      lineHeight: 23,
      fontWeight: '800',
    },


    /* ========================================================
       ERROR
    ======================================================== */

    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.redSoft,
      borderWidth: 1,
      borderColor: '#FECACA',
      borderRadius: 12,
      padding: 11,
      marginBottom: 14,
    },

    errorContent: {
      flex: 1,
      paddingRight: 8,
    },

    errorTitle: {
      color: '#991B1B',
      fontSize: 11,
      fontWeight: '800',
    },

    errorMessage: {
      color: colors.danger,
      fontSize: 9,
      lineHeight: 13,
      marginTop: 2,
    },

    retryButton: {
      backgroundColor:
        COLORS.red,
      borderRadius: 8,
      paddingVertical: 7,
      paddingHorizontal: 10,
    },

    retryText: {
      color: COLORS.white,
      fontSize: 10,
      fontWeight: '700',
    },


    /* ========================================================
       FOCUS
    ======================================================== */

    focusCard: {
      minHeight: 82,
      flexDirection: 'row',
      alignItems: 'center',

      backgroundColor:
        COLORS.primarySoft,

      borderWidth: 1,
      borderColor: '#D4E3FF',

      borderRadius: 14,

      paddingHorizontal: 12,
      paddingVertical: 11,

      marginBottom: 19,
    },

    focusIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,

      backgroundColor:
        COLORS.primary,

      alignItems: 'center',
      justifyContent:
        'center',

      marginRight: 11,
    },

    focusIconText: {
      color: COLORS.white,
      fontSize: 23,
      fontWeight: '500',
    },

    focusContent: {
      flex: 1,
      paddingRight: 7,
    },

    focusTitle: {
      color: COLORS.text,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '800',
    },

    focusDescription: {
      color: COLORS.secondary,
      fontSize: 10,
      lineHeight: 14,
      marginTop: 2,
    },

    focusArrow: {
      width: 26,
      height: 26,
      borderRadius: 8,

      alignItems: 'center',
      justifyContent:
        'center',

      backgroundColor:
        colors.primaryLight,
    },

    focusArrowText: {
      color: COLORS.primary,
      fontSize: 16,
      fontWeight: '700',
    },


    /* ========================================================
       SECTION
    ======================================================== */

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 9,
    },

    sectionTitle: {
      color: COLORS.text,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '800',
    },

    sectionHint: {
      color: COLORS.muted,
      fontSize: 9,
      fontWeight: '600',
    },


    /* ========================================================
       PERFORMANCE
       
       FIXED 2 × 2 GRID
    ======================================================== */

    performanceGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent:
        'space-between',
      marginBottom: 17,
    },

    performanceWrapper: {
      width: '48.5%',
      marginBottom: 9,
    },

    performanceCard: {
      width: '100%',
      minHeight: 108,

      flexDirection: 'row',
      alignItems: 'center',

      backgroundColor:
        COLORS.surface,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      borderRadius: 14,

      padding: 11,

      elevation: 1,

      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.035,
      shadowRadius: 3,
    },

    performanceIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,

      alignItems: 'center',
      justifyContent:
        'center',

      marginRight: 10,
      flexShrink: 0,
    },

    performanceIconText: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '800',
    },

    performanceInfo: {
      flex: 1,
      minWidth: 0,
    },

    performanceTitle: {
      color: COLORS.secondary,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '600',
    },

    performanceValue: {
      color: COLORS.text,
      fontSize: 21,
      lineHeight: 26,
      fontWeight: '800',
      marginTop: 2,
    },

    performanceSubtitle: {
      color: COLORS.muted,
      fontSize: 8,
      lineHeight: 11,
      marginTop: 1,
    },


    /* ========================================================
       TODAY
    ======================================================== */

    todayCard: {
      minHeight: 78,

      flexDirection: 'row',
      alignItems: 'center',

      backgroundColor:
        COLORS.surface,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      borderRadius: 14,

      paddingVertical: 12,

      marginBottom: 18,
    },

    todayItem: {
      flex: 1,
      alignItems: 'center',
    },

    todayValue: {
      color: COLORS.primary,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '800',
    },

    todayLabel: {
      color: COLORS.muted,
      fontSize: 9,
      lineHeight: 13,
      marginTop: 2,
    },

    todayDivider: {
      width: 1,
      height: 35,
      backgroundColor:
        COLORS.border,
    },


    /* ========================================================
       QUICK ACTIONS
    ======================================================== */

    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent:
        'space-between',
      marginBottom: 18,
    },

    quickAction: {
      width: '31.5%',
      minHeight: 82,

      backgroundColor:
        COLORS.surface,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      borderRadius: 13,

      alignItems: 'center',
      justifyContent:
        'center',

      paddingHorizontal: 4,
      marginBottom: 8,
    },

    quickIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,

      alignItems: 'center',
      justifyContent:
        'center',

      marginBottom: 5,
    },

    quickIconText: {
      fontSize: 15,
      lineHeight: 19,
      fontWeight: '800',
    },

    quickTitle: {
      maxWidth: '90%',
      color: COLORS.text,
      fontSize: 9,
      lineHeight: 12,
      fontWeight: '700',
      textAlign: 'center',
    },

    quickSubtitle: {
      maxWidth: '90%',
      color: COLORS.muted,
      fontSize: 7,
      lineHeight: 10,
      marginTop: 1,
      textAlign: 'center',
    },


    /* ========================================================
       WORK SUMMARY
    ======================================================== */

    summaryCard: {
      backgroundColor:
        COLORS.surface,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      borderRadius: 14,

      padding: 13,

      marginBottom: 18,
    },

    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    summaryHeaderIcon: {
      width: 34,
      height: 34,
      borderRadius: 9,

      backgroundColor:
        COLORS.primarySoft,

      alignItems: 'center',
      justifyContent:
        'center',

      marginRight: 9,
    },

    summaryHeaderIconText: {
      color: COLORS.primary,
      fontSize: 17,
      fontWeight: '800',
    },

    summaryHeaderContent: {
      flex: 1,
    },

    summaryTitle: {
      color: COLORS.text,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '800',
    },

    summarySubtitle: {
      color: COLORS.muted,
      fontSize: 8,
      lineHeight: 12,
      marginTop: 1,
    },

    summaryStats: {
      flexDirection: 'row',

      marginTop: 13,
      paddingTop: 11,

      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },

    summaryStat: {
      flex: 1,
      alignItems: 'center',
    },

    summaryValue: {
      color: COLORS.primary,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
    },

    summaryLabel: {
      color: COLORS.muted,
      fontSize: 8,
      lineHeight: 11,
      marginTop: 1,
    },

    workButton: {
      height: 40,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',

      backgroundColor:
        COLORS.primary,

      borderRadius: 10,

      marginTop: 13,
    },

    workButtonPressed: {
      backgroundColor:
        COLORS.primaryDark,

      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    workButtonText: {
      color: COLORS.white,
      fontSize: 10,
      fontWeight: '800',
    },

    workButtonArrow: {
      color: COLORS.white,
      fontSize: 14,
      fontWeight: '700',
      marginLeft: 6,
    },


    /* ========================================================
       PRESS
    ======================================================== */

    pressed: {
      opacity: 0.72,

      transform: [
        {
          scale: 0.985,
        },
      ],
    },


    /* ========================================================
       FOOTER
    ======================================================== */

    footer: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 8,
    },

    footerTitle: {
      color: COLORS.muted,
      fontSize: 9,
      lineHeight: 12,
      fontWeight: '700',
    },

    footerSubtitle: {
      color: '#B8C0CC',
      fontSize: 8,
      lineHeight: 11,
      marginTop: 2,
    },

  }));